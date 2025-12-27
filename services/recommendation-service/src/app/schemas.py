from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class UserEventIn(BaseModel):
    eventId: Optional[str] = Field(default=None, description="Optional idempotency key.")
    userId: str = Field(..., description="User identifier.")
    productId: str = Field(..., description="Product identifier.")
    eventType: Literal[
        "product.viewed",
        "product.scrolled",
        "cart.added",
        "order.completed",
    ]
    eventValue: float = Field(
        default=1.0,
        description="Optional engagement value (e.g., dwell ms or scroll depth).",
    )
    sessionId: Optional[str] = Field(default=None, description="Browsing session identifier.")
    source: Optional[str] = Field(default=None, description="Event source, e.g., web-app.")
    createdAt: Optional[datetime] = Field(default=None, description="Event timestamp (UTC).")

