$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$packagesDir = Join-Path $repoRoot "tools\localstack\packages"

if (-not (Test-Path $packagesDir)) {
  New-Item -Path $packagesDir -ItemType Directory | Out-Null
}

Get-ChildItem -Path $packagesDir -Filter "*.zip" -ErrorAction SilentlyContinue | Remove-Item -Force

function New-ServiceZip {
  param(
    [Parameter(Mandatory = $true)] [string] $ServiceName,
    [Parameter(Mandatory = $true)] [string] $ZipName
  )

  $serviceRoot = Join-Path $repoRoot ("services\" + $ServiceName)

  if (-not (Test-Path $serviceRoot)) {
    throw "Service not found: $serviceRoot"
  }

  $nodeModules = Join-Path $serviceRoot "node_modules"
  if (-not (Test-Path $nodeModules)) {
    throw "Missing node_modules for $ServiceName. Run npm install in services\$ServiceName first."
  }

  $paths = @(
    (Join-Path $serviceRoot "src"),
    (Join-Path $serviceRoot "node_modules"),
    (Join-Path $serviceRoot "package.json"),
    (Join-Path $serviceRoot "package-lock.json")
  ) | Where-Object { Test-Path $_ }

  $zipPath = Join-Path $packagesDir $ZipName
  Compress-Archive -Path $paths -DestinationPath $zipPath -Force
  Write-Host "Built package: $zipPath" -ForegroundColor Cyan
}

Write-Host "Building LocalStack Lambda packages..." -ForegroundColor Cyan
New-ServiceZip -ServiceName "inventory-service" -ZipName "inventory-service.zip"
New-ServiceZip -ServiceName "payment-service" -ZipName "payment-service.zip"
New-ServiceZip -ServiceName "shipping-service" -ZipName "shipping-service.zip"

Write-Host "Starting local infrastructure..." -ForegroundColor Cyan
docker compose -f (Join-Path $repoRoot "docker-compose.local.yml") up -d --build

Write-Host "Waiting for LocalStack to be ready..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  docker exec novamart-localstack awslocal events list-event-buses | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 2
}

if (-not $ready) {
  throw "LocalStack did not become ready in time."
}

Write-Host "Initializing LocalStack resources..." -ForegroundColor Cyan
docker exec novamart-localstack bash /etc/localstack/init/ready.d/01-init-aws.sh

Write-Host "Local dev stack is ready." -ForegroundColor Green
