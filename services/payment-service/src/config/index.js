const AWS = require('aws-sdk');

// Configuration loader
const config = {
  aws: {
    region: process.env.AWS_REGION || 'us-east-2',
    eventBusName: process.env.EVENT_BUS_NAME || 'default',
    paymentTableName: process.env.PAYMENT_TABLE_NAME || 'payments',
    refundTableName: process.env.REFUND_TABLE_NAME || 'refunds'
  },
  eventSource: 'novamart.payment-service',
  currency: 'USD'
};

// Initialize AWS clients
const eventBridge = new AWS.EventBridge({ region: config.aws.region });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: config.aws.region });

module.exports = {
  config,
  eventBridge,
  dynamodb
};