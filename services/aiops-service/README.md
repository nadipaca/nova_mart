# NovaMart AI Ops / Observability Service

Python FastAPI service for anomaly detection, SLO monitoring, and scaling recommendations.

- Bounded context: AI-driven observability and autoscaling
- Data sources: metrics, logs, traces from all NovaMart services
- Deployment: EKS (Kubernetes) with Istio sidecar and mTLS
- Integration:
  - Consumes metric events (e.g., `metric.emitted`) from EventBridge
  - Emits `scale.recommendation` events for KEDA / infra to act on

## Local API

### Ingest metrics (no Kafka required)
```
POST /metrics
{
  "service": "order-service",
  "latencyMs": 420.5,
  "success": true
}
```

### Inspect decisions
```
GET /anomalies
```

## Decision Policy (interview-ready)
- Uses p95 latency + error rate against configurable SLOs.
- Enforces a minimum sample size (`MIN_SAMPLE_SIZE`) before deciding.
- Adds cooldown (`COOLDOWN_SECONDS`) to prevent scale thrash.
- Emits a reason + confidence score for each decision.

