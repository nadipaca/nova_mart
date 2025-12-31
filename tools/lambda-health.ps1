param(
  [string] $LocalStackContainer = "novamart-localstack"
)

$ErrorActionPreference = "Stop"

$running = docker ps --filter "name=$LocalStackContainer" --format "{{.Names}}"
if (-not $running) {
  throw "LocalStack container '$LocalStackContainer' is not running."
}

$payload = @'
{
  "detail": {
    "healthCheck": true
  }
}
'@

$tmpPath = [System.IO.Path]::GetTempFileName()
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($tmpPath, $payload, $utf8NoBom)

docker cp $tmpPath "${LocalStackContainer}:/tmp/lambda-health.json" | Out-Null

$functions = @(
  "novamart-inventory-handler",
  "novamart-payment-handler",
  "novamart-refund-handler",
  "novamart-shipping-handler"
)

foreach ($fn in $functions) {
  docker exec $LocalStackContainer awslocal lambda invoke --function-name $fn --payload file:///tmp/lambda-health.json /tmp/lambda-health-response.json | Out-Null
  docker exec $LocalStackContainer cat /tmp/lambda-health-response.json | Out-Null
}

Remove-Item -Path $tmpPath -Force
