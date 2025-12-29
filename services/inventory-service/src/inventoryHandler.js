import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dynamoConfig = {
  region: process.env.AWS_REGION || 'us-east-2'
};

// Use local DynamoDB if AWS_ENDPOINT_URL is set
if (process.env.AWS_ENDPOINT_URL) {
  dynamoConfig.endpoint = process.env.AWS_ENDPOINT_URL;
}

const dynamoClient = new DynamoDBClient(dynamoConfig);
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const eventBridgeConfig = {
  region: process.env.AWS_REGION || 'us-east-2'
};

if (process.env.EVENTBRIDGE_ENDPOINT_URL) {
  eventBridgeConfig.endpoint = process.env.EVENTBRIDGE_ENDPOINT_URL;
}

const eventBridge = new EventBridgeClient(eventBridgeConfig);

const INVENTORY_TABLE_NAME = process.env.INVENTORY_TABLE_NAME || 'inventory';
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'default';
const EVENT_SOURCE = process.env.EVENT_SOURCE || 'novamart.inventory-service';

/**
 * Lambda handler for inventory reservation.
 * Triggered by EventBridge order.placed events.
 *
 * Expected event.detail shape:
 * {
 *   "orderId": "123",
 *   "customerId": "user-123",
 *   "items": [
 *     { "productId": "sku-1", "quantity": 2 },
 *     { "productId": "sku-2", "quantity": 1 }
 *   ]
 * }
 */
export const inventoryHandler = async (event) => {
  console.log('Received event:', JSON.stringify(event));

  const order = event.detail;
  if (!order || !Array.isArray(order.items)) {
    console.error('Invalid event.detail for inventory handler');
    return;
  }

  const unavailableItems = []; // items with insufficient stock discovered in first pass
  const updates = []; // candidates to decrement

  // First pass: check availability for all items
  for (const item of order.items) {
    const productId = String(item.productId);
    const quantity = Number(item.quantity);

    const getParams = {
      TableName: INVENTORY_TABLE_NAME,
      Key: { productId }
    };

    const { Item } = await dynamodb.send(new GetCommand(getParams));

    const available = Item && typeof Item.stock === 'number'
      ? Item.stock
      : 0;

    if (available < quantity) {
      unavailableItems.push({
        productId,
        requested: quantity,
        available
      });
    } else {
      updates.push({ productId, quantity });
    }
  }

  // Try to decrement stock for candidates (best-effort). Collect reserved and failed.
  const reservedItems = [];
  const failedUpdates = [];

  // Second pass: decrement stock for all items (best-effort, non-transactional).
  for (const u of updates) {
    const updateParams = {
      TableName: INVENTORY_TABLE_NAME,
      Key: { productId: u.productId },
      UpdateExpression: 'SET stock = stock - :q',
      ConditionExpression: 'attribute_exists(stock) AND stock >= :q',
      ExpressionAttributeValues: {
        ':q': u.quantity
      }
    };

    try {
      await dynamodb.send(new UpdateCommand(updateParams));
      reservedItems.push({ productId: u.productId, quantity: u.quantity });
    } catch (err) {
      console.error(
        `Failed to update inventory for productId=${u.productId}`,
        err
      );
      failedUpdates.push({ productId: u.productId, requested: u.quantity, available: null, error: (err && err.message) || 'update_failed' });
    }
  }

  // Publish events:
  // 1) If any items were reserved, publish inventory.reserved so downstream (order/payment) continues processing reserved items.
  if (reservedItems.length > 0) {
    await publishInventoryEvent('inventory.reserved', {
      orderId: order.orderId,
      customerId: order.customerId,
      items: reservedItems
    });
    console.log('Reserved items:', JSON.stringify(reservedItems));
  }

  // 2) If there are any unavailable/failed items, publish a failure event that indicates refunds are required for those items.
  const failedItems = [...unavailableItems, ...failedUpdates];

  if (failedItems.length > 0) {
    // Provide reservedItems alongside failedItems so downstream services can reconcile and refund only failed items.
    await publishInventoryEvent('inventory.reservation_failed', {
      orderId: order.orderId,
      customerId: order.customerId,
      failedItems,
      reservedItems
    });

    console.log('Reservation failed for items:', JSON.stringify(failedItems));
    // Note: do NOT throw — Lambda successfully processed event and told the system which items failed.
  }
// If no reserved items and there are failures, still return (we already published reservation_failed).


  if (unavailableItems.length > 0) {
    await publishInventoryEvent('inventory.out_of_stock', {
      orderId: order.orderId,
      customerId: order.customerId,
      unavailableItems
    });
  } else {
    // Emit inventory.reserved
    await publishInventoryEvent('inventory.reserved', {
      orderId: order.orderId,
      customerId: order.customerId,
      items: updates
    });
  }
};

async function publishInventoryEvent(detailType, payload) {
  const params = {
    Entries: [
      {
        EventBusName: EVENT_BUS_NAME,
        Source: EVENT_SOURCE,
        DetailType: detailType,
        Detail: JSON.stringify(payload)
      }
    ]
  };

  console.log(
    `Publishing ${detailType} event:`,
    JSON.stringify(payload)
  );

  // Skip EventBridge locally unless a local endpoint is configured.
  const hasLocalEventBridge = Boolean(process.env.EVENTBRIDGE_ENDPOINT_URL);
  const isLocalDynamo = Boolean(process.env.AWS_ENDPOINT_URL);
  const eventBridgeDisabled = process.env.EVENTBRIDGE_DISABLED === 'true';

  if (eventBridgeDisabled || (!hasLocalEventBridge && (process.env.AWS_SAM_LOCAL === 'true' || isLocalDynamo))) {
    console.log('Local mode: Skipping EventBridge publish');
    console.log(`   Event would be published: ${detailType}`);
    return;
  }

  await eventBridge.send(new PutEventsCommand(params));
}
