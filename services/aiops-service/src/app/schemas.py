from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MetricEvent(BaseModel):
    service: str = Field(..., description="Service emitting the metric.")
    latencyMs: float = Field(..., ge=0, description="Observed request latency in ms.")
    success: bool = Field(default=True, description="Whether the request succeeded.")
    requestId: Optional[str] = Field(default=None, description="Optional trace/request id.")
    timestamp: Optional[datetime] = Field(default=None, description="Event timestamp (UTC).")


class ScaleDecisionOut(BaseModel):
    service: str
    recommendation: str
    reason: str
    averageLatencyMs: float
    p95LatencyMs: float
    errorRate: float
    confidence: float
    decidedAt: datetime

