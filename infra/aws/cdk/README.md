# NovaMart AWS CDK

AWS CDK application(s) for provisioning NovaMart infrastructure.

- Defines stacks for shared resources (API Gateway, Cognito, EventBridge)
- Defines service-specific stacks (Lambda functions, RDS clusters, DynamoDB tables)
- Enforces least-privilege IAM roles and uses Secrets Manager for sensitive data

