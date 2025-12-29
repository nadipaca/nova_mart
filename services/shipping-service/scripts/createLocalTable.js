import "dotenv/config";
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-2",
  endpoint: process.env.AWS_ENDPOINT_URL || "http://localhost:8002",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy"
  }
});

const params = {
  TableName: process.env.SHIPMENT_TABLE_NAME || "shipments",
  KeySchema: [
    { AttributeName: "shipmentId", KeyType: "HASH" }
  ],
  AttributeDefinitions: [
    { AttributeName: "shipmentId", AttributeType: "S" }
  ],
  BillingMode: "PAY_PER_REQUEST"
};

async function createTable() {
  try {
    const command = new CreateTableCommand(params);
    await client.send(command);
    console.log("Created shipments table in DynamoDB Local");
    process.exit(0);
  } catch (error) {
    if (error.name === "ResourceInUseException") {
      console.log("Table already exists");
      process.exit(0);
    } else {
      console.error("Error creating table:", error);
      process.exit(1);
    }
  }
}

createTable();
