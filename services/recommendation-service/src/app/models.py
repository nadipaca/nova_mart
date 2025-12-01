from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from .database import Base


class UserEvent(Base):
    """Stores user interactions with products (views, completed orders)."""

    __tablename__ = "user_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), index=True, nullable=False)
    product_id = Column(String(128), index=True, nullable=False)
    event_type = Column(String(32), index=True, nullable=False)  # product.viewed, order.completed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

