import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { randomUUID } from 'crypto';

const dynamoConfig = {
  region: process.env.AWS_REGION || 'us-east-2'
};

const dynamoClient = new DynamoDBClient(dynamoConfig);
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-2' });

const PAYMENT_TABLE_NAME = process.env.PAYMENT_TABLE_NAME || 'payments';
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'default';
const EVENT_SOURCE = 'novamart.payment-service';

/**
 * Lambda handler for payment processing.
 * Triggered by EventBridge order.placed or inventory.reserved events.
 *
 * Expected event.detail shape:
 * {
 *   "orderId": "123",
 *   "userId": "user-123",
 *   "totalCents": 15000,
 *   "items": [...]
 * }
 */
export const paymentHandler = async (event) => {
  console.log('Payment Handler - Received event:', JSON.stringify(event));

  const order = event.detail;
  if (!order || !order.orderId) {
    console.error('Invalid event.detail for payment handler');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid order data' })
    };
  }

  const paymentId = randomUUID();
  const timestamp = new Date().toISOString();

  try {
    // Create payment record
    const paymentRecord = {
      paymentId,
      orderId: order.orderId,
      userId: order.userId || 'unknown',
      amountCents: order.totalCents || 0,
      status: 'succeeded',
      paymentMethod: 'credit_card',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await dynamodb.send(new PutCommand({
      TableName: PAYMENT_TABLE_NAME,
      Item: paymentRecord
    }));

    console.log(`Payment created successfully: ${paymentId} for order ${order.orderId}`);

    // Publish payment.succeeded event
    const successEvent = {
      Source: EVENT_SOURCE,
      DetailType: 'payment.succeeded',
      Detail: JSON.stringify({
        paymentId,
        orderId: order.orderId,
        userId: order.userId,
        amountCents: order.totalCents,
        timestamp
      }),
      EventBusName: EVENT_BUS_NAME
    };

    await eventBridge.send(new PutEventsCommand({
      Entries: [successEvent]
    }));

    console.log(`Published payment.succeeded event for order ${order.orderId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        paymentId,
        status: 'succeeded',
        orderId: order.orderId
      })
    };

  } catch (error) {
    console.error('Error processing payment:', error);

    // Publish payment.failed event
    try {
      const failedEvent = {
        Source: EVENT_SOURCE,
        DetailType: 'payment.failed',
        Detail: JSON.stringify({
          orderId: order.orderId,
          userId: order.userId,
          error: error.message,
          timestamp
        }),
        EventBusName: EVENT_BUS_NAME
      };

      await eventBridge.send(new PutEventsCommand({
        Entries: [failedEvent]
      }));

      console.log(`Published payment.failed event for order ${order.orderId}`);
    } catch (eventError) {
      console.error('Failed to publish payment.failed event:', eventError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment processing failed' })
    };
  }
};
