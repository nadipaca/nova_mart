param(
  [string] $OrderId = "order-1001",
  [string] $UserId = "user-001",
  [int] $TotalCents = 21997,
  [string] $EventBusName = "default",
  [string] $LocalStackContainer = "novamart-localstack",
  [switch] $SeedInventory,
  [string] $InventoryEndpoint = "http://localhost:8000"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

$running = docker ps --filter "name=$LocalStackContainer" --format "{{.Names}}"
if (-not $running) {
  throw "LocalStack container '$LocalStackContainer' is not running."
}

if ($SeedInventory) {
  $inventoryScript = Join-Path $repoRoot "services\\inventory-service\\seedInventory.js"
  if (-not (Test-Path $inventoryScript)) {
    throw "Missing inventory seed script: $inventoryScript"
  }

  $env:LOCAL = "true"
  $env:AWS_ENDPOINT_URL = $InventoryEndpoint
  node $inventoryScript
}

$items = @(
  @{ productId = "blend-001"; quantity = 2 },
  @{ productId = "kettle-001"; quantity = 1 }
)

$detail = @{
  orderId = $OrderId
  userId = $UserId
  customerId = $UserId
  totalCents = $TotalCents
  items = $items
} | ConvertTo-Json -Compress

$entry = @{
  Source = "novamart.order-service"
  DetailType = "order.placed"
  Detail = $detail
  EventBusName = $EventBusName
}

$request = @{
  Entries = @($entry)
} | ConvertTo-Json -Depth 6 -Compress

$tmpPath = [System.IO.Path]::GetTempFileName()
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($tmpPath, $request, $utf8NoBom)

docker cp $tmpPath "${LocalStackContainer}:/tmp/entries.json" | Out-Null
docker exec $LocalStackContainer awslocal events put-events --cli-input-json file:///tmp/entries.json

Remove-Item -Path $tmpPath -Force
