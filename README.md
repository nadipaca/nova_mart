# NovaMart Payment Service

Serverless payment service implemented as AWS Lambda functions.

## Overview
- **Runtime**: Node.js 18.x
- **Deployment**: AWS Lambda
- **Data Store**: DynamoDB
- **Events**: AWS EventBridge
- **Purpose**: Handle payment processing and refunds for orders

## Architecture
```
┌─────────────┐      ┌──────────────┐      ┌───────────────┐
│ EventBridge │─────▶│   Payment    │─────▶│   DynamoDB    │
│   Events    │      │   Lambda     │      │   (payments)  │
└─────────────┘      └──────────────┘      └───────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ EventBridge  │
                     │  (results)   │
                     └──────────────┘
```

## Events

### Consumed
- `inventory.reserved` - Trigger payment processing after inventory reservation
- `order.ready_for_payment` - Process payment
- `inventory.reservation_failed` - Trigger refund
- `order.cancelled` - Trigger refund

### Published
- `payment.succeeded` - Payment completed
- `payment.failed` - Payment failed
- `refund.succeeded` - Refund processed
- `refund.failed` - Refund failed

## Setup

### Prerequisites
- Node.js 18.x
- AWS CLI configured
- SAM CLI or Serverless Framework

### Installation
```bash
cd services/payment-service
npm install
```

### Environment Variables
```bash
export PAYMENT_TABLE_NAME=payments
export REFUND_TABLE_NAME=refunds
export EVENT_BUS_NAME=default
export AWS_REGION=us-east-2
```

### Deploy with SAM
```bash
sam build
sam deploy --guided
```

### Deploy with Serverless
```bash
serverless deploy
```

## Testing

### Run Unit Tests
```bash
npm run test:unit
```

### Run Integration Tests
```bash
npm run test:integration
```

### Seed Test Events
```bash
npm run seed
```

### Check Payment Records
```bash
npm run check
```

## Local Development

### One-command Docker network (LocalStack + tables + rules)
```powershell
.\tools\dev.ps1
```

### Full baseline (start + seed + lambda health + doctor)
```powershell
.\tools\dev-all.ps1
```

### Baseline health checks
```powershell
.\tools\dev-doctor.ps1
```

### Seed an order event into LocalStack
```powershell
.\tools\seed-events.ps1
```

### Optional: SAM local
```bash
sam local invoke PaymentFunction --event events/order-placed.json
```

## API

### Payment Handler
- **Trigger**: EventBridge `order.placed` event
- **Function**: `paymentHandler`
- **Input**: Order details
- **Output**: Payment record + events

### Refund Handler
- **Trigger**: EventBridge `inventory.reservation_failed` event
- **Function**: `refundHandler`
- **Input**: Failed order details
- **Output**: Refund record + events

## Data Model

### Payment Table
```javascript
{
  paymentId: "uuid",
  orderId: "string",
  customerId: "string",
  amount: "number",
  currency: "USD",
  status: "PENDING|SUCCEEDED|FAILED",
  transactionId: "string",
  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp"
}
```

### Refund Table
```javascript
{
  refundId: "uuid",
  paymentId: "string",
  orderId: "string",
  customerId: "string",
  amount: "number",
  reason: "string",
  status: "PENDING|SUCCEEDED|FAILED",
  transactionId: "string",
  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp"
}
```

## Monitoring
- CloudWatch Logs: `/aws/lambda/novamart-payment-handler`
- CloudWatch Metrics: Lambda invocations, errors, duration
- X-Ray tracing enabled

## Security
- IAM role with least privilege
- Encryption at rest (DynamoDB)
- Encryption in transit (TLS)
- No hardcoded credentials

## Future Enhancements
- [ ] Real payment gateway integration (Stripe/PayPal)
- [ ] 3D Secure authentication
- [ ] Webhook handling for async callbacks
- [ ] Multi-currency support
- [ ] Fraud detection integration
