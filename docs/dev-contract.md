## NovaMart Local Dev Contract

Scope: Docker-network only local dev. No localhost dependencies inside containers.

### Core decisions
- Docker-network mode only
- Unified LocalStack container
- Per-service DynamoDB Local containers

### Canonical shared env
Use `.env.docker` as the single source of truth for shared values:
- `AWS_REGION`
- `EVENTBRIDGE_ENDPOINT_URL`
- `EVENT_BUS_NAME`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Service-specific values stay in each service `.env`.

### Required containers (baseline health)
- `novamart-localstack`
- `novamart-inventory-dynamodb`
- `novamart-payment-dynamodb`
- `novamart-shipping-dynamodb`
- `novamart-catalog-postgres`
- `novamart-order-postgres`
- `novamart-catalog-service`
- `novamart-order-service`
- `novamart-recommendation-service`
- `novamart-aiops-service`

### Ports
- LocalStack: `4566`
- Inventory DynamoDB: `8000`
- Payment DynamoDB: `8001`
- Shipping DynamoDB: `8002`
- Catalog API: `8080`
- Order API: `8081`
- Recommendation API: `8003`
- AIOps API: `8004`
