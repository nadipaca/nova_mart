param(
  [string] $BaseUrl = "http://localhost:3000",
  [int[]] $RpsList = @(100, 200, 400, 800),
  [string] $Duration = "60s",
  [int] $P95ms = 500,
  [switch] $SeedInventory = $true,
  [string] $PayloadPath = ".\\tools\\loadtests\\inventory-order-placed.json",
  [string] $DynamoEndpoint = "http://localhost:8000"
)

$ErrorActionPreference = "Stop"

Write-Host "Ensuring DynamoDB Local + inventory HTTP service are running..." -ForegroundColor Cyan
docker compose -f docker-compose.inventory-http.yml up -d inventory-dynamodb inventory-service | Out-Host

Write-Host "Ensuring DynamoDB table exists..." -ForegroundColor Cyan
docker exec novamart-inventory-service node scripts/createLocalTable.js | Out-Host

if ($SeedInventory) {
  .\tools\loadtests\seed-inventory-table.ps1 -Mode direct -InputPath $PayloadPath -InventoryEndpoint $DynamoEndpoint | Out-Host
}

Write-Host "HTTP health check..." -ForegroundColor Cyan
Invoke-RestMethod "$BaseUrl/health" | Out-Host

foreach ($rps in $RpsList) {
  Write-Host ""
  Write-Host "=== inventory http constant RPS: $rps for $Duration (p95<$P95ms ms) ===" -ForegroundColor Cyan
  k6 run `
    -e BASE_URL=$BaseUrl `
    -e MODE=constant `
    -e RPS=$rps `
    -e DURATION=$Duration `
    -e P95_MS=$P95ms `
    -e PAYLOAD_PATH=./inventory-order-placed.json `
    .\tools\loadtests\inventory-reserve-http.k6.js
}

