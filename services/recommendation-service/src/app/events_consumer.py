"""
Kafka consumer stub for product.viewed and order.completed events.

In a real deployment, this module would be run as a separate process
or background task. For now, it illustrates how events are parsed and
stored to the database.
"""
import json
import os
from typing import Any, Dict

from aiokafka import AIOKafkaConsumer
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import UserEvent


KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_PRODUCT_VIEWED = os.getenv("TOPIC_PRODUCT_VIEWED", "product.viewed")
TOPIC_ORDER_COMPLETED = os.getenv("TOPIC_ORDER_COMPLETED", "order.completed")


async def start_consumer() -> None:
    consumer = AIOKafkaConsumer(
        TOPIC_PRODUCT_VIEWED,
        TOPIC_ORDER_COMPLETED,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        enable_auto_commit=True,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )

    await consumer.start()
    try:
        async for msg in consumer:
            handle_event(msg.topic, msg.value)
    finally:
        await consumer.stop()


def handle_event(topic: str, payload: Dict[str, Any]) -> None:
    """
    Store product.viewed / order.completed events into the user_events table.
    """
    db: Session = SessionLocal()
    try:
        if topic == TOPIC_PRODUCT_VIEWED:
            user_id = str(payload.get("userId"))
            product_id = str(payload.get("productId"))
            if user_id and product_id:
                db.add(UserEvent(user_id=user_id, product_id=product_id, event_type="product.viewed"))

        elif topic == TOPIC_ORDER_COMPLETED:
            user_id = str(payload.get("userId"))
            items = payload.get("items") or []
            for item in items:
                product_id = str(item.get("productId"))
                if user_id and product_id:
                    db.add(UserEvent(user_id=user_id, product_id=product_id, event_type="order.completed"))

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

