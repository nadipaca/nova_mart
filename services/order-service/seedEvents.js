import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

const REGION = process.env.AWS_REGION || "us-east-2";
const endpoint = process.env.EVENTBRIDGE_ENDPOINT_URL;

const clientConfig = { region: REGION };
if (endpoint) {
  clientConfig.endpoint = endpoint;
}

const client = new EventBridgeClient(clientConfig);

const userId = "user-001";
const viewedProducts = ["blend-001", "blend-002", "blend-003"];
const orderId = "order-1001";

const orderItems = [
  { productId: "blend-001", quantity: 2, unitPriceCents: 8999 },
  { productId: "kettle-001", quantity: 1, unitPriceCents: 3999 }
];

const totalCents = orderItems.reduce(
  (sum, item) => sum + item.quantity * item.unitPriceCents,
  0
);

const entries = [];

// 1) product.viewed events
for (const productId of viewedProducts) {
  entries.push({
    Source: "novamart.frontend",
    DetailType: "product.viewed",
    Detail: JSON.stringify({ userId, productId }),
    EventBusName: "default"
  });
}

// 2) search.performed event
entries.push({
  Source: "novamart.frontend",
  DetailType: "search.performed",
  Detail: JSON.stringify({ userId, query: "blender" }),
  EventBusName: "default"
});

// 3) order.placed event
entries.push({
  Source: "novamart.order-service",
  DetailType: "order.placed",
  Detail: JSON.stringify({
    orderId,
    userId,
    items: orderItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity
    })),
    totalCents
  }),
  EventBusName: "default"
});

async function main() {
  try {
    const command = new PutEventsCommand({ Entries: entries });
    const response = await client.send(command);
    console.log("PutEvents response:", JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("Failed to send seed events:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error while seeding events:", err);
  process.exit(1);
});
