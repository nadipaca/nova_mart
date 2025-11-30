# NovaMart AI Ops / Observability Service

Python FastAPI service for anomaly detection, SLO monitoring, and scaling recommendations.

- Bounded context: AI-driven observability and autoscaling
- Data sources: metrics, logs, traces from all NovaMart services
- Deployment: EKS (Kubernetes) with Istio sidecar and mTLS
- Integration:
  - Consumes metric events (e.g., `metric.emitted`) from EventBridge
  - Emits `scale.recommendation` events for KEDA / infra to act on

