param(
  [string] $BaseUrl = "http://localhost:8080",
  [string] $Path = "/products",
  [int] $Requests = 30
)

$ErrorActionPreference = "Stop"

$uri = ($BaseUrl.TrimEnd("/") + $Path)
$counts = @{}

for ($i = 0; $i -lt $Requests; $i++) {
  try {
    $resp = Invoke-WebRequest -Uri $uri -Method Get -UseBasicParsing -TimeoutSec 10
    $instance = $resp.Headers["X-Instance"]
    if (-not $instance) {
      $instance = "missing"
    }
  } catch {
    $instance = "error"
  }

  if (-not $counts.ContainsKey($instance)) {
    $counts[$instance] = 0
  }
  $counts[$instance]++
}

$counts.GetEnumerator() | Sort-Object Value -Descending | Format-Table -AutoSize Name, Value

