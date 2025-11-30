# NovaMart Catalog Service

Spring Boot service responsible for product and category management.

- Bounded context: catalog (products, categories, attributes, pricing metadata)
- Data store: PostgreSQL on AWS RDS (per-service schema)
- Deployment: EKS (Kubernetes) with Istio sidecar and mTLS
- Integration:
  - Exposed via API Gateway / BFF for browse/search
  - Publishes domain events (e.g., `product.created`, `product.updated`) to EventBridge

