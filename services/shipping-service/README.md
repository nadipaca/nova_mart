# NovaMart Shipping Service

Node.js (NestJS/Express) service responsible for shipments and delivery tracking.

- Bounded context: shipping (shipments, tracking, carrier integration)
- Data store: PostgreSQL or DynamoDB (per-service database)
- Deployment: EKS (Kubernetes) with Istio sidecar and mTLS
- Integration:
  - Consumes events such as `payment.succeeded`, `shipment.delivered` from EventBridge
  - Exposes shipment tracking APIs via API Gateway / BFF

