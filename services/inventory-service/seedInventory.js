import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const REGION = "us-east-2";
const TABLE_NAME = "inventory";

// Use local DynamoDB if LOCAL env var is set
const clientConfig = process.env.LOCAL 
  ? { 
      region: REGION, 
      endpoint: "http://localhost:8001",
      credentials: {
        accessKeyId: "dummy",
        secretAccessKey: "dummy"
      }
    }
  : { region: REGION };

const items = [
  // Blenders
  { productId: "blend-001", warehouseId: "wh-1", stock: 50 },
  { productId: "blend-002", warehouseId: "wh-1", stock: 40 },
  { productId: "blend-003", warehouseId: "wh-1", stock: 35 },
  { productId: "blend-004", warehouseId: "wh-1", stock: 20 },
  { productId: "blend-005", warehouseId: "wh-1", stock: 25 },

  // Kitchen items
  { productId: "kettle-001", warehouseId: "wh-1", stock: 60 },
  { productId: "kettle-002", warehouseId: "wh-1", stock: 45 },
  { productId: "toaster-001", warehouseId: "wh-1", stock: 30 },
  { productId: "toaster-002", warehouseId: "wh-1", stock: 25 },
  { productId: "coffee-001", warehouseId: "wh-1", stock: 40 },
  { productId: "coffee-002", warehouseId: "wh-1", stock: 15 },

  // Electronics
  { productId: "laptop-001", warehouseId: "wh-1", stock: 10 },
  { productId: "laptop-002", warehouseId: "wh-1", stock: 5 },
  { productId: "laptop-003", warehouseId: "wh-1", stock: 8 },

  { productId: "headphone-001", warehouseId: "wh-1", stock: 50 },
  { productId: "headphone-002", warehouseId: "wh-1", stock: 35 },
  { productId: "headphone-003", warehouseId: "wh-1", stock: 45 },

  { productId: "monitor-001", warehouseId: "wh-1", stock: 18 },
  { productId: "monitor-002", warehouseId: "wh-1", stock: 12 },
  { productId: "mouse-001", warehouseId: "wh-1", stock: 70 },
  { productId: "keyboard-001", warehouseId: "wh-1", stock: 40 }
];

const client = new DynamoDBClient(clientConfig);

async function main() {
  for (const item of items) {
    const command = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        productId: { S: item.productId },
        warehouseId: { S: item.warehouseId },
        availableQty: { N: item.stock.toString() }
      }
    });

    try {
      await client.send(command);
      console.log(
        `Inserted inventory item: productId=${item.productId}, warehouseId=${item.warehouseId}, availableQty=${item.stock}`
      );
    } catch (err) {
      console.error(
        `Failed to insert inventory item: productId=${item.productId}, warehouseId=${item.warehouseId}`,
        err
      );
    }
  }
}

main().catch((err) => {
  console.error("Unexpected error while seeding inventory:", err);
  process.exit(1);
});
