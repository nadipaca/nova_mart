param(
  [string] $BaseUrl = "http://catalog-lb:8080",
  [ValidateSet("vus", "rps", "constant")]
  [string] $Mode = "constant",
  [string] $Script = "catalog-products.k6.js",
  [int] $Rps = 1000,
  [string] $Duration = "60s",
  [int] $P95ms = 100,
  [switch] $NoReuse,
  [string] $PayloadPath,
  [string] $Network = "novamart",
  [string] $Image = "grafana/k6:latest"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Location).Path
$scriptsDir = Join-Path $repoRoot "tools\\loadtests"
$k6Script = "/scripts/$Script"

if (-not (Test-Path $scriptsDir)) {
  throw "Missing directory: $scriptsDir"
}

docker network inspect $Network | Out-Null

$noReuseValue = if ($NoReuse) { "1" } else { "0" }

Write-Host "Running k6 in Docker on network '$Network' against $BaseUrl" -ForegroundColor Cyan
Write-Host "TIP: If the image isn't present, run: docker pull $Image" -ForegroundColor Yellow

if (-not $PayloadPath -and (Test-Path (Join-Path $scriptsDir "order-request.json"))) {
  $PayloadPath = "/scripts/order-request.json"
}

if ($PayloadPath) {
  Write-Host "Using PAYLOAD_PATH=$PayloadPath" -ForegroundColor Cyan
}

docker run --rm `
  --network $Network `
  -v "${scriptsDir}:/scripts:ro" `
  -w /scripts `
  -e BASE_URL=$BaseUrl `
  -e MODE=$Mode `
  -e RPS=$Rps `
  -e DURATION=$Duration `
  -e P95_MS=$P95ms `
  -e NO_REUSE=$noReuseValue `
  $(if ($PayloadPath) { @("-e","PAYLOAD_PATH=$PayloadPath") } else { @() }) `
  $Image run $k6Script
