const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

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
exports.inventoryHandler = async (event) => {
  console.log('Received event:', JSON.stringify(event));

  const order = event.detail;
  if (!order || !Array.isArray(order.items)) {
    console.error('Invalid event.detail for inventory handler');
    return;
  }

  const outOfStockItems = [];
  const updates = [];

  // First pass: check availability for all items
  for (const item of order.items) {
    const productId = String(item.productId);
    const quantity = Number(item.quantity);

    const getParams = {
      TableName: INVENTORY_TABLE_NAME,
      Key: { productId }
    };

    const { Item } = await dynamodb.get(getParams).promise();

    const available = Item && typeof Item.availableQty === 'number'
      ? Item.availableQty
      : 0;

    if (available < quantity) {
      outOfStockItems.push({
        productId,
        requested: quantity,
        available
      });
    } else {
      updates.push({ productId, quantity });
    }
  }

  if (outOfStockItems.length > 0) {
    // Emit inventory.out_of_stock
    await publishInventoryEvent('inventory.out_of_stock', {
      orderId: order.orderId,
      customerId: order.customerId,
      outOfStockItems
    });

    console.log('Out of stock:', JSON.stringify(outOfStockItems));
    return;
  }

  // Second pass: decrement stock for all items (best-effort, non-transactional).
  for (const u of updates) {
    const updateParams = {
      TableName: INVENTORY_TABLE_NAME,
      Key: { productId: u.productId },
      UpdateExpression: 'SET availableQty = availableQty - :q',
      ConditionExpression: 'attribute_exists(availableQty) AND availableQty >= :q',
      ExpressionAttributeValues: {
        ':q': u.quantity
      }
    };

    try {
      await dynamodb.update(updateParams).promise();
    } catch (err) {
      console.error(
        `Failed to update inventory for productId=${u.productId}`,
        err
      );
      // In a real system, you might emit a compensating event here.
      outOfStockItems.push({
        productId: u.productId,
        requested: u.quantity,
        available: null
      });
    }
  }

  if (outOfStockItems.length > 0) {
    await publishInventoryEvent('inventory.out_of_stock', {
      orderId: order.orderId,
      customerId: order.customerId,
      outOfStockItems
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

  await eventBridge.putEvents(params).promise();
}
