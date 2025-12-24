import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { randomUUID } from 'crypto';

const dynamoConfig = {
  region: process.env.AWS_REGION || 'us-east-2'
};

const dynamoClient = new DynamoDBClient(dynamoConfig);
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-2' });

const PAYMENT_TABLE_NAME = process.env.PAYMENT_TABLE_NAME || 'payments';
const REFUND_TABLE_NAME = process.env.REFUND_TABLE_NAME || 'refunds';
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'default';
const EVENT_SOURCE = 'novamart.payment-service';

/**
 * Lambda handler for refund processing.
 * Triggered by EventBridge inventory.reservation_failed or order.cancelled events.
 *
 * Expected event.detail shape:
 * {
 *   "orderId": "123",
 *   "userId": "user-123",
 *   "reason": "insufficient_inventory" | "order_cancelled"
 * }
 */
export const refundHandler = async (event) => {
  console.log('Refund Handler - Received event:', JSON.stringify(event));

  const order = event.detail;
  if (!order || !order.orderId) {
    console.error('Invalid event.detail for refund handler');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid order data' })
    };
  }

  const refundId = randomUUID();
  const timestamp = new Date().toISOString();
  const reason = event['detail-type'] === 'inventory.reservation_failed' 
    ? 'insufficient_inventory' 
    : 'order_cancelled';

  try {
    // Find the original payment (if exists)
    let originalPayment = null;
    try {
      const queryResult = await dynamodb.send(new QueryCommand({
        TableName: PAYMENT_TABLE_NAME,
        IndexName: 'orderId-index',
        KeyConditionExpression: 'orderId = :orderId',
        ExpressionAttributeValues: {
          ':orderId': order.orderId
        }
      }));

      if (queryResult.Items && queryResult.Items.length > 0) {
        originalPayment = queryResult.Items[0];
        console.log(`Found original payment: ${originalPayment.paymentId}`);
      } else {
        console.log(`No payment found for order ${order.orderId}, creating refund record anyway`);
      }
    } catch (queryError) {
      console.error('Error querying payment:', queryError);
    }

    // Create refund record
    const refundRecord = {
      refundId,
      orderId: order.orderId,
      paymentId: originalPayment?.paymentId || 'not_found',
      userId: order.userId || originalPayment?.userId || 'unknown',
      amountCents: originalPayment?.amountCents || 0,
      reason,
      status: 'processed',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await dynamodb.send(new PutCommand({
      TableName: REFUND_TABLE_NAME,
      Item: refundRecord
    }));

    console.log(`Refund created successfully: ${refundId} for order ${order.orderId}`);

    // Publish refund.processed event
    const refundEvent = {
      Source: EVENT_SOURCE,
      DetailType: 'refund.processed',
      Detail: JSON.stringify({
        refundId,
        orderId: order.orderId,
        userId: refundRecord.userId,
        amountCents: refundRecord.amountCents,
        reason,
        timestamp
      }),
      EventBusName: EVENT_BUS_NAME
    };

    await eventBridge.send(new PutEventsCommand({
      Entries: [refundEvent]
    }));

    console.log(`Published refund.processed event for order ${order.orderId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        refundId,
        status: 'processed',
        orderId: order.orderId,
        reason
      })
    };

  } catch (error) {
    console.error('Error processing refund:', error);

    // Publish refund.failed event
    try {
      const failedEvent = {
        Source: EVENT_SOURCE,
        DetailType: 'refund.failed',
        Detail: JSON.stringify({
          orderId: order.orderId,
          error: error.message,
          reason,
          timestamp
        }),
        EventBusName: EVENT_BUS_NAME
      };

      await eventBridge.send(new PutEventsCommand({
        Entries: [failedEvent]
      }));

      console.log(`Published refund.failed event for order ${order.orderId}`);
    } catch (eventError) {
      console.error('Failed to publish refund.failed event:', eventError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Refund processing failed' })
    };
  }
};
