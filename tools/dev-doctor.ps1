$ErrorActionPreference = "Stop"

$requiredContainers = @(
  "novamart-localstack",
  "novamart-inventory-dynamodb",
  "novamart-payment-dynamodb",
  "novamart-shipping-dynamodb",
  "novamart-catalog-postgres",
  "novamart-order-postgres"
)

$requiredServices = @(
  "catalog-service",
  "order-service",
  "recommendation-service",
  "aiops-service"
)

function Assert-ContainerRunning {
  param([string] $Name)
  $running = docker ps --filter "name=$Name" --format "{{.Names}}"
  if (-not $running) {
    throw "Container not running: $Name"
  }
}

foreach ($name in $requiredContainers) {
  Assert-ContainerRunning -Name $name
}

$composeFile = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "docker-compose.local.yml"
$runningServices = docker compose -f $composeFile ps --services --filter "status=running"
foreach ($service in $requiredServices) {
  if (-not ($runningServices -contains $service)) {
    throw "Service not running: $service"
  }
}

# Verify Postgres connectivity and seed
docker exec novamart-catalog-postgres psql -U novamart -d novamart_catalog -t -A -c "select count(*) from products;" | Out-Null
docker exec novamart-order-postgres psql -U novamart -d novamart_orders -t -A -c "select 1;" | Out-Null

# Verify DynamoDB tables
docker exec novamart-localstack awslocal dynamodb list-tables --endpoint-url http://novamart-inventory-dynamodb:8000 | Out-Null
docker exec novamart-localstack awslocal dynamodb list-tables --endpoint-url http://novamart-payment-dynamodb:8000 | Out-Null
docker exec novamart-localstack awslocal dynamodb list-tables --endpoint-url http://novamart-shipping-dynamodb:8000 | Out-Null

# Verify LocalStack Lambdas
docker exec novamart-localstack awslocal lambda list-functions | Out-Null

# Lambda health checks
& (Join-Path $PSScriptRoot "lambda-health.ps1")

# Verify HTTP health endpoints
Invoke-WebRequest -Uri "http://localhost:8080/actuator/health" -UseBasicParsing | Out-Null
Invoke-WebRequest -Uri "http://localhost:8081/actuator/health" -UseBasicParsing | Out-Null
Invoke-WebRequest -Uri "http://localhost:8003/health" -UseBasicParsing | Out-Null
Invoke-WebRequest -Uri "http://localhost:8004/health" -UseBasicParsing | Out-Null

Write-Host "Baseline health checks passed." -ForegroundColor Green
