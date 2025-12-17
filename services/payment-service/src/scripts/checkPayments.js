const AWS = require('aws-sdk');

const REGION = 'us-east-2';
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: REGION });

async function checkPayments() {
  try {
    // Check payments
    const payments = await dynamodb.scan({
      TableName: 'payments',
      Limit: 10
    }).promise();

    console.log('\n=== Recent Payments ===');
    console.log(JSON.stringify(payments.Items, null, 2));

    // Check refunds
    const refunds = await dynamodb.scan({
      TableName: 'refunds',
      Limit: 10
    }).promise();

    console.log('\n=== Recent Refunds ===');
    console.log(JSON.stringify(refunds.Items, null, 2));

  } catch (error) {
    console.error('Error checking payments:', error);
    process.exit(1);
  }
}

checkPayments();