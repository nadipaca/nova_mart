"""
Kafka consumer for metric.emitted events and publisher for scale.recommendation events.
"""
import json
import os
from typing import Any, Dict, Optional

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from .policy import evaluate_metric_event
from .state import metrics_store


KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_METRIC_EMITTED = os.getenv("TOPIC_METRIC_EMITTED", "metric.emitted")
TOPIC_SCALE_RECOMMENDATION = os.getenv("TOPIC_SCALE_RECOMMENDATION", "scale.recommendation")


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


async def handle_metric_event(
    payload: Dict[str, Any], producer: Optional[AIOKafkaProducer]
) -> Optional[Dict[str, Any]]:
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
    decision = evaluate_metric_event(payload, metrics_store)
    if not decision:
        return None

    event = decision.to_event()
    if producer is not None:
        await producer.send_and_wait(TOPIC_SCALE_RECOMMENDATION, event)
    return event

