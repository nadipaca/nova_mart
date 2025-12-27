from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from .database import Base


class UserEvent(Base):
    """Stores user interactions with products (views, completed orders)."""

    __tablename__ = "user_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(128), index=True, nullable=True)
    user_id = Column(String(128), index=True, nullable=False)
    product_id = Column(String(128), index=True, nullable=False)
    event_type = Column(String(32), index=True, nullable=False)  # product.viewed, order.completed
    event_value = Column(Float, nullable=False, default=1.0)
    session_id = Column(String(128), index=True, nullable=True)
    source = Column(String(64), index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

