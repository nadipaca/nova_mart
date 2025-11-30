# NovaMart Inventory Service

Serverless inventory service implemented as AWS Lambda functions.

- Runtime: Node.js or Python (Lambda)
- Bounded context: stock levels, reservations, and availability
- Data store: DynamoDB (per-service tables)
- Integration:
  - Event-driven via EventBridge; consumes `order.placed`, `order.cancelled`, `shipment.delivered`
  - Emits `inventory.reserved`, `inventory.out_of_stock` events
  - Exposes `GET /inventory/{productId}` via API Gateway

