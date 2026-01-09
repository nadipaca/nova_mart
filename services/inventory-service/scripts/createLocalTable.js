import 'dotenv/config';
import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';

const tableName = process.env.INVENTORY_TABLE_NAME || 'inventory';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
  endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

const params = {
  TableName: tableName,
  KeySchema: [{ AttributeName: 'productId', KeyType: 'HASH' }],
  AttributeDefinitions: [{ AttributeName: 'productId', AttributeType: 'S' }],
  BillingMode: 'PAY_PER_REQUEST',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const attempts = Number(process.env.DDB_CREATE_TABLE_ATTEMPTS || 30);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await client.send(new CreateTableCommand(params));
      console.log(`✅ Created table '${tableName}' in DynamoDB Local`);
      return;
    } catch (err) {
      if (err?.name === 'ResourceInUseException') {
        console.log(`ℹ️ Table '${tableName}' already exists`);
        return;
      }

      const msg = String(err?.message || err);
      const transient =
        /ECONNREFUSED/i.test(msg) ||
        /ENOTFOUND/i.test(msg) ||
        /TimeoutError/i.test(msg) ||
        /socket hang up/i.test(msg);

      if (transient && attempt < attempts) {
        console.log(`⏳ DynamoDB not ready yet (attempt ${attempt}/${attempts}), retrying...`);
        await sleep(1000);
        continue;
      }

      throw err;
    }
  }
}

main().catch((err) => {
  console.error('❌ Error creating table:', err);
  process.exit(1);
});

