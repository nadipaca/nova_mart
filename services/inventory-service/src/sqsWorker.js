import 'dotenv/config';
import { SQSClient, GetQueueUrlCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { inventoryHandler } from './inventoryHandler.js';

const region = process.env.AWS_REGION || 'us-east-2';
const sqsEndpoint = process.env.SQS_ENDPOINT_URL || process.env.EVENTBRIDGE_ENDPOINT_URL;
const queueName = process.env.INVENTORY_QUEUE_NAME || 'novamart-inventory-orders';

if (!sqsEndpoint) {
  throw new Error('Missing SQS_ENDPOINT_URL (or EVENTBRIDGE_ENDPOINT_URL) for local EventBridge->SQS worker');
}

const sqs = new SQSClient({
  region,
  endpoint: sqsEndpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
});

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveQueueUrl() {
  const out = await sqs.send(new GetQueueUrlCommand({ QueueName: queueName }));
  if (!out.QueueUrl) throw new Error(`Could not resolve QueueUrl for ${queueName}`);
  return out.QueueUrl;
}

async function handleMessage(body) {
  const event = JSON.parse(body);
  if (!event || !event.detail) return;
  await inventoryHandler(event);
}

async function main() {
  let queueUrl;
  while (!queueUrl) {
    try {
      queueUrl = await resolveQueueUrl();
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err);
      console.log(`Waiting for SQS/LocalStack to be ready (queue=${queueName}): ${msg}`);
      await sleep(1000);
    }
  }
  console.log(`Inventory SQS worker started. queueName=${queueName} queueUrl=${queueUrl}`);

  while (true) {
    try {
      const res = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 30,
        })
      );

      const messages = res.Messages || [];
      if (messages.length === 0) continue;

      for (const m of messages) {
        try {
          if (m.Body) await handleMessage(m.Body);
        } catch (err) {
          console.error('Failed to process SQS message:', err);
        } finally {
          if (m.ReceiptHandle) {
            await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: m.ReceiptHandle }));
          }
        }
      }
    } catch (err) {
      console.error('SQS poll loop error:', err);
      await sleep(1000);
    }
  }
}

main().catch((err) => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});
