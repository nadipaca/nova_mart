"""
Kafka consumer for metric.emitted events and publisher for scale.recommendation events.
"""
import json
import os
from typing import Any, Dict

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from .state import metrics_store


KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_METRIC_EMITTED = os.getenv("TOPIC_METRIC_EMITTED", "metric.emitted")
TOPIC_SCALE_RECOMMENDATION = os.getenv("TOPIC_SCALE_RECOMMENDATION", "scale.recommendation")

LATENCY_THRESHOLD_MS = float(os.getenv("LATENCY_THRESHOLD_MS", "500.0"))
ERROR_RATE_THRESHOLD = float(os.getenv("ERROR_RATE_THRESHOLD", "0.05"))


async def start_consumer() -> None:
    consumer = AIOKafkaConsumer(
        TOPIC_METRIC_EMITTED,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        enable_auto_commit=True,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )

    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )

    await consumer.start()
    await producer.start()
    try:
        async for msg in consumer:
            await handle_metric_event(msg.value, producer)
    finally:
        await consumer.stop()
        await producer.stop()


async def handle_metric_event(payload: Dict[str, Any], producer: AIOKafkaProducer) -> None:
    """
    Process a single metric.emitted event, update moving averages,
    and emit a scale.recommendation event when thresholds are exceeded.

    Expected payload shape (example):
    {
      "service": "order-service",
      "latencyMs": 120.5,
      "success": true
    }
    """
    service = str(payload.get("service"))
    if not service:
        return

    latency_ms = float(payload.get("latencyMs", 0.0))
    success = bool(payload.get("success", True))
    error = not success

    window = metrics_store.add_metric(service, latency_ms, error)

    avg_latency = window.average_latency
    error_rate = window.error_rate

    recommendation: str | None = None

    if avg_latency > LATENCY_THRESHOLD_MS or error_rate > ERROR_RATE_THRESHOLD:
        recommendation = "scale_up"
    elif avg_latency < LATENCY_THRESHOLD_MS * 0.5 and error_rate < ERROR_RATE_THRESHOLD * 0.5:
        recommendation = "scale_down"

    if recommendation:
        metrics_store.set_scale_recommendation(service, recommendation)
        event = {
            "service": service,
            "recommendation": recommendation,
            "averageLatencyMs": avg_latency,
            "errorRate": error_rate,
        }
        await producer.send_and_wait(TOPIC_SCALE_RECOMMENDATION, event)

