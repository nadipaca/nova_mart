import "dotenv/config";
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-2",
  endpoint: process.env.AWS_ENDPOINT_URL || "http://localhost:8001",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy"
  }
});

const tables = [
  {
    TableName: process.env.PAYMENT_TABLE_NAME || "payments",
    KeySchema: [
      { AttributeName: "paymentId", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "paymentId", AttributeType: "S" },
      { AttributeName: "orderId", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "orderId-index",
        KeySchema: [{ AttributeName: "orderId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: process.env.REFUND_TABLE_NAME || "refunds",
    KeySchema: [
      { AttributeName: "refundId", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "refundId", AttributeType: "S" }
    ],
    BillingMode: "PAY_PER_REQUEST"
  }
];

async function createTable(params) {
  try {
    await client.send(new CreateTableCommand(params));
    console.log(`Created table: ${params.TableName}`);
  } catch (error) {
    if (error.name === "ResourceInUseException") {
      console.log(`Table already exists: ${params.TableName}`);
    } else {
      console.error(`Error creating table ${params.TableName}:`, error);
      throw error;
    }
  }
}

async function main() {
  for (const table of tables) {
    await createTable(table);
  }
}

main().catch(() => process.exit(1));
