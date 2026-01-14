param(
  [string] $BaseUrl = "http://localhost:8080",
  [int[]] $RpsList = @(600, 1000, 2000, 4000),
  [string] $Duration = "60s",
  [int] $P95ms = 100,
  [switch] $NoReuse,
  [int] $ScaleCatalog = 3,
  [switch] $EnsureCompose = $true
)

$ErrorActionPreference = "Stop"

if ($EnsureCompose) {
  Write-Host "Ensuring catalog-service scale=$ScaleCatalog and catalog-lb is running..." -ForegroundColor Cyan
  docker compose -f docker-compose.local.yml up -d --scale catalog-service=$ScaleCatalog catalog-service catalog-lb | Out-Host
}

Write-Host "Checking LB distribution via X-Instance..." -ForegroundColor Cyan
.\tools\loadtests\check-lb-distribution.ps1 -BaseUrl $BaseUrl -Requests 30

$noReuseValue = if ($NoReuse) { "1" } else { "0" }

foreach ($rps in $RpsList) {
  Write-Host "" 
  Write-Host "=== k6 constant RPS: $rps for $Duration (NO_REUSE=$noReuseValue, P95_MS=$P95ms) ===" -ForegroundColor Cyan
  k6 run `
    -e BASE_URL=$BaseUrl `
    -e MODE=constant `
    -e RPS=$rps `
    -e DURATION=$Duration `
    -e NO_REUSE=$noReuseValue `
    -e P95_MS=$P95ms `
    .\tools\loadtests\catalog-products.k6.js
}
