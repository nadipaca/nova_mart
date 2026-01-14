param(
  [string] $BaseUrl = "http://localhost:8081",
  [int[]] $RpsList = @(50, 100, 200, 400),
  [string] $Duration = "60s",
  [int] $P95ms = 1000,
  [int] $ScaleOrder = 3,
  [switch] $EnsureCompose = $true,
  [switch] $SeedInventory = $true,
  [switch] $UseDockerK6,
  [string] $Network = "novamart",
  [string] $K6Image = "grafana/k6:latest"
)

$ErrorActionPreference = "Stop"

function Wait-HttpOk {
  param(
    [string] $Url,
    [int] $TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "Service did not become ready within ${TimeoutSeconds}s: $Url"
}

if ($EnsureCompose) {
  Write-Host "Ensuring order-service scale=$ScaleOrder and dependencies are running..." -ForegroundColor Cyan
  docker compose -f docker-compose.local.yml up -d `
    --scale order-service=$ScaleOrder `
    localstack inventory-dynamodb order-postgres order-service order-lb | Out-Host
}

Write-Host "Waiting for order-lb /actuator/health..." -ForegroundColor Cyan
Wait-HttpOk -Url ($BaseUrl.TrimEnd("/") + "/actuator/health") -TimeoutSeconds 90

if ($SeedInventory) {
  .\tools\loadtests\seed-order-inventory.ps1 | Out-Host
}

Write-Host "Proving LB distribution via X-Instance..." -ForegroundColor Cyan
.\tools\loadtests\check-lb-distribution.ps1 -BaseUrl $BaseUrl -Path "/actuator/health" -Requests 60

foreach ($rps in $RpsList) {
  Write-Host ""
  Write-Host "=== order-service constant RPS: $rps for $Duration (p95<$P95ms ms) ===" -ForegroundColor Cyan

  if ($UseDockerK6) {
    .\tools\loadtests\run-k6-in-docker.ps1 `
      -Network $Network `
      -Image $K6Image `
      -BaseUrl $BaseUrl `
      -Mode constant `
      -Script "order-create.k6.js" `
      -Rps $rps `
      -Duration $Duration `
      -P95ms $P95ms
  } else {
    k6 run `
      -e BASE_URL=$BaseUrl `
      -e MODE=constant `
      -e RPS=$rps `
      -e DURATION=$Duration `
      -e P95_MS=$P95ms `
      .\tools\loadtests\order-create.k6.js
  }
}
