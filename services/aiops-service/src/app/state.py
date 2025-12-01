from collections import deque
from dataclasses import dataclass, field
from threading import Lock
from typing import Deque, Dict, List, Optional


@dataclass
class MetricPoint:
    latency_ms: float
    error: bool


@dataclass
class ServiceMetricsWindow:
    service_name: str
    window: Deque[MetricPoint] = field(default_factory=lambda: deque(maxlen=100))
    last_scale_recommendation: Optional[str] = None

    def add_point(self, latency_ms: float, error: bool) -> None:
        self.window.append(MetricPoint(latency_ms=latency_ms, error=error))

    @property
    def average_latency(self) -> float:
        if not self.window:
            return 0.0
        return sum(p.latency_ms for p in self.window) / len(self.window)

    @property
    def error_rate(self) -> float:
        if not self.window:
            return 0.0
        errors = sum(1 for p in self.window if p.error)
        return errors / len(self.window)


class MetricsStore:
    """
    In-memory store of moving windows and anomalies for each service.
    Thread-safe for simple usage.
    """

    def __init__(self) -> None:
        self._metrics: Dict[str, ServiceMetricsWindow] = {}
        self._lock = Lock()

    def add_metric(self, service: str, latency_ms: float, error: bool) -> ServiceMetricsWindow:
        with self._lock:
            window = self._metrics.get(service)
            if window is None:
                window = ServiceMetricsWindow(service_name=service)
                self._metrics[service] = window
            window.add_point(latency_ms, error)
            return window

    def set_scale_recommendation(self, service: str, recommendation: str) -> None:
        with self._lock:
            window = self._metrics.get(service)
            if window is None:
                window = ServiceMetricsWindow(service_name=service)
                self._metrics[service] = window
            window.last_scale_recommendation = recommendation

    def get_snapshot(self) -> List[dict]:
        with self._lock:
            result: List[dict] = []
            for service, window in self._metrics.items():
                result.append(
                    {
                        "service": service,
                        "averageLatencyMs": window.average_latency,
                        "errorRate": window.error_rate,
                        "sampleSize": len(window.window),
                        "lastScaleRecommendation": window.last_scale_recommendation,
                    }
                )
            return result


metrics_store = MetricsStore()

