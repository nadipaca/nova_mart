# NovaMart Payment Service

Serverless payment service implemented as AWS Lambda functions.

- Runtime: Node.js or Python (Lambda)
- Bounded context: payment authorization, capture, and status
- Integration:
  - Consumes `order.ready_for_payment` events from EventBridge
  - Emits `payment.succeeded`, `payment.failed` events
  - Integrates with a mocked Stripe/Razorpay provider for demo purposes

