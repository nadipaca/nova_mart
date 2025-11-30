# NovaMart Order Service

Spring Boot service responsible for orders, checkout, and order-related sagas.

- Bounded context: orders (cart, checkout, order lifecycle, sagas)
- Data store: PostgreSQL on AWS RDS (per-service schema)
- Deployment: EKS (Kubernetes) with Istio sidecar and mTLS
- Integration:
  - Exposed via API Gateway / BFF for order placement and history
  - Produces and consumes events on EventBridge (e.g., `order.placed`, `order.ready_for_payment`, `order.completed`)

