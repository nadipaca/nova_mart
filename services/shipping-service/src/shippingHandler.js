// services/shipping-service/src/shippingHandler.js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-2' });

const SHIPMENT_TABLE_NAME = process.env.SHIPMENT_TABLE_NAME || 'shipments';
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'default';
const EVENT_SOURCE = 'novamart.shipping-service';

export const shippingHandler = async (event) => {
  console.log('Received shipping event:', JSON.stringify(event));

  const detail = event.detail;
  if (!detail || !detail.orderId) {
    console.error('Invalid event for shipping handler');
    return;
  }

  const shipmentId = uuidv4();
  const timestamp = new Date().toISOString();

  // Create shipment record
  const shipment = {
    shipmentId,
    orderId: detail.orderId,
    customerId: detail.customerId,
    paymentId: detail.paymentId,
    status: 'PENDING',
    trackingNumber: `NOVA${Date.now()}`,
    carrier: 'FedEx',
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await dynamodb.send(new PutCommand({
    TableName: SHIPMENT_TABLE_NAME,
    Item: shipment
  }));

  console.log(`Shipment created: ${shipmentId}`);

  // Publish shipment.created event
  await publishShippingEvent('shipment.created', {
    shipmentId,
    orderId: detail.orderId,
    customerId: detail.customerId,
    trackingNumber: shipment.trackingNumber,
    estimatedDelivery: shipment.estimatedDelivery,
    timestamp
  });

  // Simulate shipping progression
  setTimeout(() => updateShipmentStatus(shipmentId, 'SHIPPED'), 3000);
  setTimeout(() => updateShipmentStatus(shipmentId, 'IN_TRANSIT'), 6000);
  setTimeout(() => updateShipmentStatus(shipmentId, 'DELIVERED'), 10000);

  return { statusCode: 200, body: JSON.stringify({ shipmentId }) };
};

async function updateShipmentStatus(shipmentId, status) {
  await dynamodb.send(new UpdateCommand({
    TableName: SHIPMENT_TABLE_NAME,
    Key: { shipmentId },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    }
  }));

  await publishShippingEvent('shipment.status_updated', {
    shipmentId,
    status,
    timestamp: new Date().toISOString()
  });
}

async function publishShippingEvent(detailType, payload) {
  const params = {
    Entries: [{
      EventBusName: EVENT_BUS_NAME,
      Source: EVENT_SOURCE,
      DetailType: detailType,
      Detail: JSON.stringify(payload)
    }]
  };

  console.log(`Publishing ${detailType} event:`, JSON.stringify(payload));
  
  if (process.env.AWS_SAM_LOCAL === 'true' || process.env.AWS_ENDPOINT_URL) {
    console.log('⚠️  Local mode: Skipping EventBridge publish');
    return;
  }

  await eventBridge.send(new PutEventsCommand(params));
}