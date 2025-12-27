# NovaMart Recommendation Service

Python FastAPI service responsible for personalized recommendations and item relationships.

- Bounded context: personalization (user profiles, item-item relations)
- Data store: SQLite for local dev (recommendations.db)
- Deployment: EKS (Kubernetes) with Istio sidecar and mTLS
- Integration:
  - Consumes behavior events (`product.viewed`, `order.completed`) from EventBridge
  - Exposes APIs like `GET /recommendations?userId=...` via API Gateway / BFF

## Local API

### Ingest behavior events
```
POST /events
{
  "eventId": "evt-123",
  "userId": "user-42",
  "productId": "sku-123",
  "eventType": "product.scrolled",
  "eventValue": 0.82,
  "sessionId": "sess-99",
  "source": "web-app"
}
```

### Get recommendations
```
GET /recommendations?userId=user-42&limit=10
```

## Scoring (behavioral-v1)
- Events are weighted by type (view < scroll < add-to-cart < order).
- Engagement values (scroll depth, dwell time) boost the score.
- Recency decay applies a configurable half-life (`RECOMMENDER_HALF_LIFE_HOURS`).

