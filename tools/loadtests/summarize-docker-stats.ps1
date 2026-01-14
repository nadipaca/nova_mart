param(
  [string] $InputPath = ".\\tools\\loadtests\\docker-stats.csv",
  [int] $Top = 5
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InputPath)) {
  throw "Stats file not found: $InputPath"
}

function Convert-SizeToBytes {
  param([string] $Value)

  $trimmed = $Value.Trim()
  if ($trimmed -eq "--") {
    return 0
  }

  if ($trimmed -match '^([0-9.]+)\s*([kKmMgGtTpP]i?B|B)$') {
    $num = [double]$matches[1]
    $unit = $matches[2].ToUpperInvariant()
    switch ($unit) {
      "B"  { return $num }
      "KB" { return $num * 1kb }
      "KIB" { return $num * 1kb }
      "MB" { return $num * 1mb }
      "MIB" { return $num * 1mb }
      "GB" { return $num * 1gb }
      "GIB" { return $num * 1gb }
      "TB" { return $num * 1tb }
      "TIB" { return $num * 1tb }
      default { return $num }
    }
  }

  return 0
}

function Parse-IOPair {
  param([string] $Value)

  if ([string]::IsNullOrWhiteSpace($Value) -or $Value.Trim() -eq "--") {
    return [PSCustomObject]@{ ReadBytes = 0; WriteBytes = 0 }
  }

  $parts = $Value -split "/" | ForEach-Object { $_.Trim() }
  if ($parts.Count -ne 2) {
    return [PSCustomObject]@{ ReadBytes = 0; WriteBytes = 0 }
  }

  return [PSCustomObject]@{
    ReadBytes = Convert-SizeToBytes $parts[0]
    WriteBytes = Convert-SizeToBytes $parts[1]
  }
}

function Convert-PercentToDouble {
  param([string] $Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return 0
  }

  $trimmed = $Value.Trim()
  if ($trimmed -eq "--") {
    return 0
  }

  $trimmed = $trimmed -replace "%", ""

  $result = 0.0
  if ([double]::TryParse($trimmed, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$result)) {
    return $result
  }

  return 0
}

function Convert-MemUsageToBytes {
  param([string] $Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return 0
  }

  $trimmed = $Value.Trim()
  if ($trimmed -eq "--") {
    return 0
  }

  $used = ($trimmed -split "/" | Select-Object -First 1).Trim()
  return Convert-SizeToBytes $used
}

$rows = Import-Csv $InputPath
if (-not $rows) {
  throw "No rows found in $InputPath"
}

$stats = $rows | Group-Object container | ForEach-Object {
  $cpuValues = @()
  $memBytesValues = @()

  $netFirst = $null
  $netLast = $null
  $blockFirst = $null
  $blockLast = $null

  $groupRows = $_.Group | Sort-Object timestamp

  foreach ($row in $groupRows) {
    $cpuValues += Convert-PercentToDouble $row.cpu
    $memBytesValues += Convert-MemUsageToBytes $row.mem
  }

  if ($groupRows.Count -gt 0) {
    $netFirst = Parse-IOPair $groupRows[0].net_io
    $netLast = Parse-IOPair $groupRows[-1].net_io
    $blockFirst = Parse-IOPair $groupRows[0].block_io
    $blockLast = Parse-IOPair $groupRows[-1].block_io
  } else {
    $netFirst = [PSCustomObject]@{ ReadBytes = 0; WriteBytes = 0 }
    $netLast = [PSCustomObject]@{ ReadBytes = 0; WriteBytes = 0 }
    $blockFirst = [PSCustomObject]@{ ReadBytes = 0; WriteBytes = 0 }
    $blockLast = [PSCustomObject]@{ ReadBytes = 0; WriteBytes = 0 }
  }

  $netDelta = ($netLast.ReadBytes + $netLast.WriteBytes) - ($netFirst.ReadBytes + $netFirst.WriteBytes)
  $blockDelta = ($blockLast.ReadBytes + $blockLast.WriteBytes) - ($blockFirst.ReadBytes + $blockFirst.WriteBytes)
  $netBytes = [Math]::Max(0, $netDelta)
  $blockBytes = [Math]::Max(0, $blockDelta)

  $avgCpu = ($cpuValues | Measure-Object -Average).Average
  $maxCpu = ($cpuValues | Measure-Object -Maximum).Maximum
  $avgMem = ($memBytesValues | Measure-Object -Average).Average
  $maxMem = ($memBytesValues | Measure-Object -Maximum).Maximum

  [PSCustomObject]@{
    Container = $_.Name
    AvgCPU = [Math]::Round($avgCpu, 2)
    MaxCPU = [Math]::Round($maxCpu, 2)
    AvgMemMB = [Math]::Round($avgMem / 1mb, 2)
    MaxMemMB = [Math]::Round($maxMem / 1mb, 2)
    NetBytes = $netBytes
    BlockBytes = $blockBytes
  }
}

Write-Host "Top CPU (avg) containers:" -ForegroundColor Cyan
$stats | Sort-Object AvgCPU -Descending | Select-Object -First $Top `
  Container, AvgCPU, MaxCPU | Format-Table -AutoSize

Write-Host "Top Network I/O containers:" -ForegroundColor Cyan
$stats | Sort-Object NetBytes -Descending | Select-Object -First $Top `
  Container, @{Name="NetMB";Expression={[Math]::Round($_.NetBytes / 1mb, 2)}} | Format-Table -AutoSize

Write-Host "Top Block I/O containers:" -ForegroundColor Cyan
$stats | Sort-Object BlockBytes -Descending | Select-Object -First $Top `
  Container, @{Name="BlockMB";Expression={[Math]::Round($_.BlockBytes / 1mb, 2)}} | Format-Table -AutoSize

Write-Host "Top Memory (avg) containers:" -ForegroundColor Cyan
$stats | Sort-Object AvgMemMB -Descending | Select-Object -First $Top `
  Container, AvgMemMB, MaxMemMB | Format-Table -AutoSize
