param(
  [string] $BaseUrl = "http://localhost:4566",
  [string] $FunctionName = "novamart-inventory-handler",
  [int[]] $RpsList = @(100, 200, 400, 800),
  [string] $Duration = "60s",
  [int] $P95ms = 500,
  [switch] $SeedInventory = $true,
  [string] $PayloadPath = ".\\tools\\loadtests\\inventory-order-placed.json"
)

$ErrorActionPreference = "Stop"

Write-Host "Ensuring LocalStack + DynamoDB (inventory) are running..." -ForegroundColor Cyan
docker compose -f docker-compose.local.yml up -d localstack inventory-dynamodb | Out-Host

if ($SeedInventory) {
  .\tools\loadtests\seed-inventory-table.ps1 -InputPath $PayloadPath | Out-Host
}

Write-Host "Lambda health check..." -ForegroundColor Cyan
$healthPayload = '{"detail":{"healthCheck":true}}'
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($healthPayload))
$cmd = @"
set -eu
echo '$b64' | base64 -d > /tmp/payload.json
awslocal lambda invoke --function-name '$FunctionName' --payload file:///tmp/payload.json /tmp/out.json >/dev/null
cat /tmp/out.json
"@
docker exec novamart-localstack sh -lc $cmd | Out-Null

foreach ($rps in $RpsList) {
  Write-Host ""
  Write-Host "=== inventory lambda constant RPS: $rps for $Duration (p95<$P95ms ms) ===" -ForegroundColor Cyan
  k6 run `
    -e BASE_URL=$BaseUrl `
    -e FUNCTION_NAME=$FunctionName `
    -e AWS_REGION=us-east-2 `
    -e AWS_ACCESS_KEY_ID=test `
    -e AWS_SECRET_ACCESS_KEY=test `
    -e MODE=constant `
    -e RPS=$rps `
    -e DURATION=$Duration `
    -e P95_MS=$P95ms `
    -e PAYLOAD_PATH=./inventory-order-placed.json `
    .\tools\loadtests\inventory-reserve.k6.js
}
