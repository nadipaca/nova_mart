param(
  [int] $Seconds = 300,
  [string] $OutputPath = ".\\tools\\loadtests\\docker-stats.csv"
)

$ErrorActionPreference = "Stop"

$header = "timestamp,container,cpu,mem,mem_percent,net_io,block_io,pids"
Set-Content -Path $OutputPath -Value $header

$format = "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}"

for ($i = 0; $i -lt $Seconds; $i++) {
  $timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
  $lines = docker stats --no-stream --format $format
  foreach ($line in $lines) {
    Add-Content -Path $OutputPath -Value "$timestamp,$line"
  }
  if (($i + 1) % 30 -eq 0) {
    Write-Host "Captured $($i + 1)s / $Seconds" -ForegroundColor Cyan
  }
  Start-Sleep -Seconds 1
}

Write-Host "Docker stats written to $OutputPath" -ForegroundColor Green
