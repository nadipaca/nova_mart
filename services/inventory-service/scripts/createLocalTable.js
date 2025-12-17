import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "us-east-2",
  endpoint: "http://localhost:8001",
  credentials: {
    accessKeyId: "dummy",
    secretAccessKey: "dummy"
  }
});

const params = {
  TableName: "inventory",
  KeySchema: [
    { AttributeName: "productId", KeyType: "HASH" }
  ],
  AttributeDefinitions: [
    { AttributeName: "productId", AttributeType: "S" }
  ],
  BillingMode: "PAY_PER_REQUEST"
};

async function createTable() {
  try {
    const command = new CreateTableCommand(params);
    await client.send(command);
    console.log("✅ Created inventory table in DynamoDB Local");
    process.exit(0);
  } catch (error) {
    if (error.name === "ResourceInUseException") {
      console.log("ℹ️  Table already exists");
      process.exit(0);
    } else {
      console.error("❌ Error creating table:", error);
      process.exit(1);
    }
  }
}

createTable();
