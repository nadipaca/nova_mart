#!/bin/bash
set -euo pipefail

PACKAGES_DIR="/etc/localstack/init/packages"
REGION="${AWS_DEFAULT_REGION:-us-east-2}"
ACCOUNT_ID="000000000000"

function wait_for_endpoint() {
  local endpoint_url="$1"
  local retries="${2:-10}"
  local sleep_seconds="${3:-1}"

  # We only need to know whether the host:port is reachable. Using AWS CLI here can hang on
  # connection attempts, so prefer a simple TCP/HTTP probe with a hard timeout.
  for ((i=1; i<=retries; i++)); do
    if curl -s --max-time 1 "${endpoint_url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${sleep_seconds}"
  done

  return 1
}

function ensure_table() {
  local table_name="$1"
  local endpoint_url="$2"
  shift 2

  if ! wait_for_endpoint "${endpoint_url}"; then
    echo "Skipping DynamoDB table ${table_name} (endpoint not reachable: ${endpoint_url})"
    return 0
  fi

  if awslocal dynamodb describe-table --table-name "${table_name}" --endpoint-url "${endpoint_url}" >/dev/null 2>&1; then
    echo "DynamoDB table ${table_name} already exists"
    return
  fi

  awslocal dynamodb create-table "$@" --endpoint-url "${endpoint_url}"
  echo "Created DynamoDB table ${table_name}"
}

function upsert_lambda() {
  local function_name="$1"
  local zip_path="$2"
  shift 2

  if awslocal lambda get-function --function-name "${function_name}" >/dev/null 2>&1; then
    awslocal lambda update-function-code \
      --function-name "${function_name}" \
      --zip-file "fileb://${zip_path}" >/dev/null
    awslocal lambda update-function-configuration \
      --function-name "${function_name}" "$@" >/dev/null
    echo "Updated Lambda ${function_name}"
    return
  fi

  awslocal lambda create-function \
    --function-name "${function_name}" \
    --zip-file "fileb://${zip_path}" "$@"
  echo "Created Lambda ${function_name}"
}

function ensure_rule() {
  local rule_name="$1"
  shift

  awslocal events put-rule "$@" >/dev/null
  echo "Ensured EventBridge rule ${rule_name}"
}

function ensure_target() {
  awslocal events put-targets "$@" >/dev/null
}

function ensure_permission() {
  awslocal lambda add-permission "$@" >/dev/null 2>&1 || true
}

echo "Initializing LocalStack resources for NovaMart..."

DISABLE_INVENTORY_LAMBDA="${DISABLE_INVENTORY_LAMBDA:-false}"
INVENTORY_QUEUE_NAME="${INVENTORY_QUEUE_NAME:-novamart-inventory-orders}"

# DynamoDB tables
ensure_table "inventory" "http://novamart-inventory-dynamodb:8000" \
  --table-name inventory \
  --attribute-definitions AttributeName=productId,AttributeType=S \
  --key-schema AttributeName=productId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

ensure_table "payments" "http://novamart-payment-dynamodb:8000" \
  --table-name payments \
  --attribute-definitions AttributeName=paymentId,AttributeType=S AttributeName=orderId,AttributeType=S \
  --key-schema AttributeName=paymentId,KeyType=HASH \
  --global-secondary-indexes '[{"IndexName":"orderId-index","KeySchema":[{"AttributeName":"orderId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST

ensure_table "refunds" "http://novamart-payment-dynamodb:8000" \
  --table-name refunds \
  --attribute-definitions AttributeName=refundId,AttributeType=S AttributeName=paymentId,AttributeType=S AttributeName=orderId,AttributeType=S \
  --key-schema AttributeName=refundId,KeyType=HASH \
  --global-secondary-indexes '[{"IndexName":"paymentId-index","KeySchema":[{"AttributeName":"paymentId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"orderId-index","KeySchema":[{"AttributeName":"orderId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST

ensure_table "shipments" "http://novamart-shipping-dynamodb:8000" \
  --table-name shipments \
  --attribute-definitions AttributeName=shipmentId,AttributeType=S \
  --key-schema AttributeName=shipmentId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# SQS queue (used as an EventBridge target for inventory to avoid LocalStack Lambda invoke bottleneck)
if awslocal sqs get-queue-url --queue-name "${INVENTORY_QUEUE_NAME}" >/dev/null 2>&1; then
  echo "SQS queue ${INVENTORY_QUEUE_NAME} already exists"
else
  awslocal sqs create-queue --queue-name "${INVENTORY_QUEUE_NAME}" >/dev/null
  echo "Created SQS queue ${INVENTORY_QUEUE_NAME}"
fi

INVENTORY_QUEUE_URL="$(awslocal sqs get-queue-url --queue-name "${INVENTORY_QUEUE_NAME}" --query QueueUrl --output text)"
INVENTORY_QUEUE_ARN="$(awslocal sqs get-queue-attributes --queue-url "${INVENTORY_QUEUE_URL}" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)"

# Lambdas
if [[ "${DISABLE_INVENTORY_LAMBDA}" != "true" ]]; then
  upsert_lambda "novamart-inventory-handler" "${PACKAGES_DIR}/inventory-service.zip" \
    --runtime nodejs18.x \
    --handler src/inventoryHandler.inventoryHandler \
    --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-role \
    --timeout 30 \
    --memory-size 256 \
    --environment "Variables={AWS_REGION=${REGION},AWS_ENDPOINT_URL=http://novamart-inventory-dynamodb:8000,EVENTBRIDGE_ENDPOINT_URL=http://novamart-localstack:4566,EVENT_BUS_NAME=default,EVENT_SOURCE=novamart.inventory-service,INVENTORY_TABLE_NAME=inventory,AWS_ACCESS_KEY_ID=test,AWS_SECRET_ACCESS_KEY=test}"
else
  echo "Skipping inventory Lambda setup (DISABLE_INVENTORY_LAMBDA=true)"
fi

upsert_lambda "novamart-payment-handler" "${PACKAGES_DIR}/payment-service.zip" \
  --runtime nodejs18.x \
  --handler src/paymentHandler.paymentHandler \
  --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-role \
  --timeout 30 \
  --memory-size 512 \
  --environment "Variables={AWS_REGION=${REGION},AWS_ENDPOINT_URL=http://novamart-payment-dynamodb:8000,EVENTBRIDGE_ENDPOINT_URL=http://novamart-localstack:4566,EVENT_BUS_NAME=default,PAYMENT_TABLE_NAME=payments,REFUND_TABLE_NAME=refunds,AWS_ACCESS_KEY_ID=test,AWS_SECRET_ACCESS_KEY=test}"

upsert_lambda "novamart-refund-handler" "${PACKAGES_DIR}/payment-service.zip" \
  --runtime nodejs18.x \
  --handler src/refundHandler.refundHandler \
  --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-role \
  --timeout 30 \
  --memory-size 512 \
  --environment "Variables={AWS_REGION=${REGION},AWS_ENDPOINT_URL=http://novamart-payment-dynamodb:8000,EVENTBRIDGE_ENDPOINT_URL=http://novamart-localstack:4566,EVENT_BUS_NAME=default,PAYMENT_TABLE_NAME=payments,REFUND_TABLE_NAME=refunds,AWS_ACCESS_KEY_ID=test,AWS_SECRET_ACCESS_KEY=test}"

upsert_lambda "novamart-shipping-handler" "${PACKAGES_DIR}/shipping-service.zip" \
  --runtime nodejs18.x \
  --handler src/shippingHandler.shippingHandler \
  --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-role \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={AWS_REGION=${REGION},AWS_ENDPOINT_URL=http://novamart-shipping-dynamodb:8000,EVENTBRIDGE_ENDPOINT_URL=http://novamart-localstack:4566,EVENT_BUS_NAME=default,SHIPMENT_TABLE_NAME=shipments,AWS_ACCESS_KEY_ID=test,AWS_SECRET_ACCESS_KEY=test}"

# EventBridge rules and targets
ensure_rule "novamart-inventory-order-placed" \
  --name novamart-inventory-order-placed \
  --event-bus-name default \
  --event-pattern '{"source":["novamart.order-service"],"detail-type":["order.placed"]}'

if [[ "${DISABLE_INVENTORY_LAMBDA}" != "true" ]]; then
  ensure_target \
    --rule novamart-inventory-order-placed \
    --event-bus-name default \
    --targets "Id=inventory-handler,Arn=arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:novamart-inventory-handler"
  ensure_permission \
    --function-name novamart-inventory-handler \
    --statement-id novamart-inventory-order-placed \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/novamart-inventory-order-placed
else
  # Route order.placed events to SQS instead of Lambda.
  ensure_target \
    --rule novamart-inventory-order-placed \
    --event-bus-name default \
    --targets "Id=inventory-orders-queue,Arn=${INVENTORY_QUEUE_ARN}"
  echo "Routed order.placed -> SQS ${INVENTORY_QUEUE_NAME} (DISABLE_INVENTORY_LAMBDA=true)"
fi

ensure_rule "novamart-payment-inventory-reserved" \
  --name novamart-payment-inventory-reserved \
  --event-bus-name default \
  --event-pattern '{"source":["novamart.inventory-service"],"detail-type":["inventory.reserved"]}'
ensure_target \
  --rule novamart-payment-inventory-reserved \
  --event-bus-name default \
  --targets "Id=payment-handler,Arn=arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:novamart-payment-handler"
ensure_permission \
  --function-name novamart-payment-handler \
  --statement-id novamart-payment-inventory-reserved \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/novamart-payment-inventory-reserved

ensure_rule "novamart-refund-inventory-failed" \
  --name novamart-refund-inventory-failed \
  --event-bus-name default \
  --event-pattern '{"source":["novamart.inventory-service"],"detail-type":["inventory.reservation_failed"]}'
ensure_target \
  --rule novamart-refund-inventory-failed \
  --event-bus-name default \
  --targets "Id=refund-handler,Arn=arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:novamart-refund-handler"
ensure_permission \
  --function-name novamart-refund-handler \
  --statement-id novamart-refund-inventory-failed \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/novamart-refund-inventory-failed

ensure_rule "novamart-refund-order-cancelled" \
  --name novamart-refund-order-cancelled \
  --event-bus-name default \
  --event-pattern '{"source":["novamart.order-service"],"detail-type":["order.cancelled"]}'
ensure_target \
  --rule novamart-refund-order-cancelled \
  --event-bus-name default \
  --targets "Id=refund-handler,Arn=arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:novamart-refund-handler"
ensure_permission \
  --function-name novamart-refund-handler \
  --statement-id novamart-refund-order-cancelled \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/novamart-refund-order-cancelled

ensure_rule "novamart-shipping-payment-succeeded" \
  --name novamart-shipping-payment-succeeded \
  --event-bus-name default \
  --event-pattern '{"source":["novamart.payment-service"],"detail-type":["payment.succeeded"]}'
ensure_target \
  --rule novamart-shipping-payment-succeeded \
  --event-bus-name default \
  --targets "Id=shipping-handler,Arn=arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:novamart-shipping-handler"
ensure_permission \
  --function-name novamart-shipping-handler \
  --statement-id novamart-shipping-payment-succeeded \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/novamart-shipping-payment-succeeded

echo "LocalStack initialization complete."
