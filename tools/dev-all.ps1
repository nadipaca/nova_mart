$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

& (Join-Path $repoRoot "tools\\dev.ps1")

# Seed inventory (required for realistic order flow)
$inventoryScript = Join-Path $repoRoot "services\\inventory-service\\seedInventory.js"
if (-not (Test-Path $inventoryScript)) {
  throw "Missing inventory seed script: $inventoryScript"
}

$env:LOCAL = "true"
$env:AWS_ENDPOINT_URL = "http://localhost:8000"
node $inventoryScript

# Lambda health checks
& (Join-Path $repoRoot "tools\\lambda-health.ps1")

# Baseline health checks
& (Join-Path $repoRoot "tools\\dev-doctor.ps1")
