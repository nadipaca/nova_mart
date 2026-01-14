param(
  [string] $OrderRequestPath = ".\\tools\\loadtests\\order-request.json",
  [int] $Stock = 100000,
  [string] $LocalstackContainer = "novamart-localstack",
  [string] $InventoryEndpoint = "http://novamart-inventory-dynamodb:8000",
  [string] $TableName = "inventory"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OrderRequestPath)) {
  throw "Order request file not found: $OrderRequestPath"
}

$json = Get-Content $OrderRequestPath -Raw | ConvertFrom-Json
if (-not $json.items) {
  throw "No items found in $OrderRequestPath"
}

function Normalize-InventoryProductId {
  param($item)

  if ($item.productSku -and ($item.productSku.ToString()).Trim().Length -gt 0) {
    return ($item.productSku.ToString()).Trim().ToLowerInvariant()
  }
  return ($item.productId.ToString()).Trim()
}

$ids = @()
foreach ($item in $json.items) {
  $id = Normalize-InventoryProductId $item
  if ($id) { $ids += $id }
}

$ids = $ids | Sort-Object -Unique
if ($ids.Count -eq 0) {
  throw "No inventory product ids could be derived from $OrderRequestPath"
}

Write-Host "Seeding DynamoDB inventory items in '$TableName' with stock=${Stock}:" -ForegroundColor Cyan
$ids | ForEach-Object { Write-Host " - $_" }

foreach ($id in $ids) {
  $itemJson = @{
    productId = @{ S = $id }
    stock = @{ N = "$Stock" }
  } | ConvertTo-Json -Compress -Depth 5

  # Windows -> docker exec quoting strips JSON quotes; send JSON as base64 and use file:// inside the container.
  $b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($itemJson))
  $cmd = @"
set -eu
echo '$b64' | base64 -d > /tmp/item.json
awslocal dynamodb put-item --endpoint-url '$InventoryEndpoint' --table-name '$TableName' --item file:///tmp/item.json >/dev/null
"@
  docker exec $LocalstackContainer sh -lc $cmd | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to seed inventory for productId=$id (exit code $LASTEXITCODE)"
  }
}

Write-Host "Seed complete." -ForegroundColor Green
