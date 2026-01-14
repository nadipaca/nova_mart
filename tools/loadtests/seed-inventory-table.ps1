param(
  [string] $InputPath = ".\\tools\\loadtests\\inventory-order-placed.json",
  [int] $Stock = 100000,
  [ValidateSet("localstack", "direct")]
  [string] $Mode = "localstack",
  [string] $LocalstackContainer = "novamart-localstack",
  [string] $InventoryEndpoint = "http://novamart-inventory-dynamodb:8000",
  [string] $TableName = "inventory"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InputPath)) {
  throw "Input file not found: $InputPath"
}

$json = Get-Content $InputPath -Raw | ConvertFrom-Json

$items = $null
if ($json.items) {
  $items = $json.items
} elseif ($json.detail -and $json.detail.items) {
  $items = $json.detail.items
}

if (-not $items) {
  throw "No items found in $InputPath (expected .items or .detail.items)"
}

function Normalize-InventoryProductId {
  param($item)

  if ($item.productSku -and ($item.productSku.ToString()).Trim().Length -gt 0) {
    return ($item.productSku.ToString()).Trim().ToLowerInvariant()
  }
  return ($item.productId.ToString()).Trim()
}

$ids = @()
foreach ($item in $items) {
  $id = Normalize-InventoryProductId $item
  if ($id) { $ids += $id }
}

$ids = $ids | Sort-Object -Unique
if ($ids.Count -eq 0) {
  throw "No inventory product ids could be derived from $InputPath"
}

Write-Host "Seeding DynamoDB table '$TableName' with stock=${Stock}:" -ForegroundColor Cyan
$ids | ForEach-Object { Write-Host " - $_" }

if ($Mode -eq "direct") {
  $seedScript = Join-Path $PSScriptRoot "..\\..\\services\\inventory-service\\scripts\\seedFromPayload.js"
  $seedScript = (Resolve-Path $seedScript).Path

  $prevEndpoint = $env:AWS_ENDPOINT_URL
  $prevRegion = $env:AWS_REGION
  $prevAk = $env:AWS_ACCESS_KEY_ID
  $prevSk = $env:AWS_SECRET_ACCESS_KEY
  $prevTable = $env:INVENTORY_TABLE_NAME

  try {
    $env:AWS_ENDPOINT_URL = $InventoryEndpoint
    $env:AWS_REGION = "us-east-2"
    if (-not $env:AWS_ACCESS_KEY_ID) { $env:AWS_ACCESS_KEY_ID = "test" }
    if (-not $env:AWS_SECRET_ACCESS_KEY) { $env:AWS_SECRET_ACCESS_KEY = "test" }
    $env:INVENTORY_TABLE_NAME = $TableName

    node $seedScript --input $InputPath --stock $Stock --table $TableName | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "Node seed script failed (exit code $LASTEXITCODE)"
    }
  } finally {
    $env:AWS_ENDPOINT_URL = $prevEndpoint
    $env:AWS_REGION = $prevRegion
    $env:AWS_ACCESS_KEY_ID = $prevAk
    $env:AWS_SECRET_ACCESS_KEY = $prevSk
    $env:INVENTORY_TABLE_NAME = $prevTable
  }

  Write-Host "Seed complete." -ForegroundColor Green
  return
}

foreach ($id in $ids) {
  $itemJson = @{
    productId = @{ S = $id }
    stock = @{ N = "$Stock" }
  } | ConvertTo-Json -Compress -Depth 5

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
