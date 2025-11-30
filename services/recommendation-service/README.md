# NovaMart Recommendation Service

Python FastAPI service responsible for personalized recommendations and item relationships.

- Bounded context: personalization (user profiles, item-item relations)
- Data store: vector store / Redis (per-service data source)
- Deployment: EKS (Kubernetes) with Istio sidecar and mTLS
- Integration:
  - Consumes behavior events (`product.viewed`, `order.completed`) from EventBridge
  - Exposes APIs like `GET /recommendations?userId=...` via API Gateway / BFF

