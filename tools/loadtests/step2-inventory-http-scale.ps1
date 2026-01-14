param(
  [int] $Replicas = 3,
  [int[]] $RpsList = @(200, 400, 600, 800),
  [string] $Duration = "60s",
  [int] $P95ms = 500,
  [switch] $SeedInventory = $true,
  [string] $PayloadPath = ".\\tools\\loadtests\\inventory-order-placed.json",
  [string] $DynamoEndpoint = "http://localhost:8000"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting inventory scale stack (replicas=$Replicas)..." -ForegroundColor Cyan
docker compose -f docker-compose.inventory-http-scale.yml up -d --build --scale inventory-service=$Replicas inventory-dynamodb inventory-service inventory-lb | Out-Host

Write-Host "Ensuring DynamoDB table exists..." -ForegroundColor Cyan
docker compose -f docker-compose.inventory-http-scale.yml exec -T inventory-service node scripts/createLocalTable.js | Out-Host

if ($SeedInventory) {
  .\tools\loadtests\seed-inventory-table.ps1 -Mode direct -InputPath $PayloadPath -InventoryEndpoint $DynamoEndpoint | Out-Host
}

Write-Host "HTTP health check (via LB)..." -ForegroundColor Cyan
Invoke-RestMethod "http://localhost:3000/health" | Out-Host

foreach ($rps in $RpsList) {
  Write-Host ""
  Write-Host "=== inventory http (scaled) constant RPS: $rps for $Duration (p95<$P95ms ms) ===" -ForegroundColor Cyan
  .\tools\loadtests\run-k6-in-docker.ps1 `
    -BaseUrl "http://inventory-lb:3000" `
    -Script "inventory-reserve-http.k6.js" `
    -Mode constant `
    -Rps $rps `
    -Duration $Duration `
    -P95ms $P95ms `
    -PayloadPath "/scripts/inventory-order-placed.json" | Out-Host
}

