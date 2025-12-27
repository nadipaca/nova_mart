from dataclasses import dataclass
from datetime import datetime, timedelta
import os
from typing import Any, Dict, Optional

from .state import MetricsStore, ServiceMetricsWindow


SLO_LATENCY_MS = float(os.getenv("SLO_LATENCY_MS", "500.0"))
SLO_ERROR_RATE = float(os.getenv("SLO_ERROR_RATE", "0.05"))
MIN_SAMPLE_SIZE = int(os.getenv("MIN_SAMPLE_SIZE", "20"))
COOLDOWN_SECONDS = int(os.getenv("COOLDOWN_SECONDS", "60"))


@dataclass
class ScaleDecision:
    service: str
    recommendation: str
    reason: str
    average_latency_ms: float
    p95_latency_ms: float
    error_rate: float
    confidence: float
    decided_at: datetime

    def to_event(self) -> Dict[str, Any]:
        return {
            "service": self.service,
            "recommendation": self.recommendation,
            "reason": self.reason,
            "averageLatencyMs": self.average_latency_ms,
            "p95LatencyMs": self.p95_latency_ms,
            "errorRate": self.error_rate,
            "confidence": self.confidence,
            "decidedAt": self.decided_at.isoformat(),
        }


def _cooldown_active(window: ServiceMetricsWindow, now: datetime) -> bool:
    if window.last_decision_at is None:
        return False
    return now - window.last_decision_at < timedelta(seconds=COOLDOWN_SECONDS)


def _build_decision(
    service: str,
    recommendation: str,
    reason: str,
    window: ServiceMetricsWindow,
    now: datetime,
) -> ScaleDecision:
    if recommendation == "scale_up":
        latency_ratio = window.p95_latency / SLO_LATENCY_MS if SLO_LATENCY_MS else 0.0
        error_ratio = window.error_rate / SLO_ERROR_RATE if SLO_ERROR_RATE else 0.0
        confidence = min(1.0, max(latency_ratio, error_ratio))
    else:
        latency_ratio = window.p95_latency / SLO_LATENCY_MS if SLO_LATENCY_MS else 0.0
        error_ratio = window.error_rate / SLO_ERROR_RATE if SLO_ERROR_RATE else 0.0
        confidence = max(0.1, 1.0 - min(1.0, max(latency_ratio, error_ratio)))

    return ScaleDecision(
        service=service,
        recommendation=recommendation,
        reason=reason,
        average_latency_ms=window.average_latency,
        p95_latency_ms=window.p95_latency,
        error_rate=window.error_rate,
        confidence=confidence,
        decided_at=now,
    )


def evaluate_metric_event(payload: Dict[str, Any], metrics_store: MetricsStore) -> Optional[ScaleDecision]:
    """
    Update metrics and evaluate scaling guidance using SLOs and cooldown.
    """
    service = str(payload.get("service", "")).strip()
    if not service:
        return None

    latency_ms = float(payload.get("latencyMs", 0.0))
    success = bool(payload.get("success", True))
    error = not success

    window = metrics_store.add_metric(service, latency_ms, error)
    if len(window.window) < MIN_SAMPLE_SIZE:
        return None

    now = datetime.utcnow()
    if _cooldown_active(window, now):
        return None

    reasons = []
    if window.p95_latency > SLO_LATENCY_MS:
        reasons.append("p95_latency")
    if window.error_rate > SLO_ERROR_RATE:
        reasons.append("error_rate")

    recommendation = None
    reason = ""

    if reasons:
        recommendation = "scale_up"
        reason = ",".join(reasons)
    elif window.p95_latency < SLO_LATENCY_MS * 0.5 and window.error_rate < SLO_ERROR_RATE * 0.5:
        recommendation = "scale_down"
        reason = "slo_underutilized"

    if not recommendation:
        return None

    decision = _build_decision(service, recommendation, reason, window, now)
    metrics_store.record_decision(
        service=service,
        recommendation=recommendation,
        reason=decision.reason,
        confidence=decision.confidence,
        decided_at=decision.decided_at,
    )
    return decision
