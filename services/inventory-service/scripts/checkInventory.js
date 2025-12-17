import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-2';
const TABLE_NAME = 'inventory';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function checkInventory() {
  try {
    // Get total count
    const scanResult = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 10
    }));

    console.log('\n=== Recent Inventory Records ===');
    console.log(JSON.stringify(scanResult.Items, null, 2));
    console.log(`\nTotal items scanned: ${scanResult.Items?.length || 0}`);

    // Check specific item
    const testItem = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { productId: 'blend-001' }
    }));

    console.log('\n=== Sample Item (blend-001) ===');
    console.log(JSON.stringify(testItem.Item, null, 2));

  } catch (error) {
    console.error('Error checking inventory:', error);
    process.exit(1);
  }
}

checkInventory();