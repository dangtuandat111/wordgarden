[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [ValidateSet('Stop', 'Clean', 'Reset')][string]$Action = 'Clean',
  [string]$Confirmation
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
if (!(Test-Path -LiteralPath (Join-Path $projectRoot 'compose.yaml')) -or
    !(Test-Path -LiteralPath (Join-Path $projectRoot 'package.json'))) { throw 'Project root not found.' }

function Assert-SafeTarget([string]$RelativePath) {
  $target = [IO.Path]::GetFullPath((Join-Path $projectRoot $RelativePath))
  if (!$target.StartsWith($projectRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe target: $target" }
  # Refuse a linked target or parent. Links inside build folders are unlinked below.
  $cursor = $target
  while ($cursor) {
    if (Test-Path -LiteralPath $cursor) {
      if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Refusing linked path: $cursor" }
    }
    $cursor = Split-Path -Parent $cursor
  }
  return $target
}

function Remove-GeneratedTree([string]$Target) {
  $item = Get-Item -LiteralPath $Target -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    # Delete the link itself; never traverse its target (Next.js creates junctions).
    if ($item.PSIsContainer) { [IO.Directory]::Delete($Target) }
    else { [IO.File]::Delete($Target) }
  } elseif ($item.PSIsContainer) {
    foreach ($child in Get-ChildItem -LiteralPath $Target -Force) { Remove-GeneratedTree $child.FullName }
    [IO.Directory]::Delete($Target)
  } else { Remove-Item -LiteralPath $Target -Force }
}

$relativeTargets = @('.next', 'tsconfig.tsbuildinfo', 'test-results')
if ($Action -eq 'Reset') { $relativeTargets += @('backups', 'node_modules') }
$targets = @()
if ($Action -ne 'Stop') { $targets = @($relativeTargets | ForEach-Object { Assert-SafeTarget $_ }) }

Write-Output "Project: $projectRoot"
Write-Output "Action: $Action"
if ($Action -eq 'Reset') {
  Write-Output 'Deletes ALL Wordgarden Compose database data, project containers/images, backups, dependencies and builds.'
  Write-Output 'Source code, .env files, shared PostgreSQL image, other projects and shared Docker build cache are retained.'
  Write-Output 'Downloads and extension storage must be cleared separately. This does not securely erase disk sectors.'
  if (!$WhatIfPreference) {
    if (!$Confirmation) { $Confirmation = Read-Host 'Type RESET WORDGARDEN to continue' }
    if ($Confirmation -cne 'RESET WORDGARDEN') { throw 'Confirmation did not match. Nothing deleted.' }
  }
}

Push-Location -LiteralPath $projectRoot
try {
  if ($Action -eq 'Stop') {
    if ($PSCmdlet.ShouldProcess('Wordgarden services', 'Stop (keep data)')) {
      & docker compose --project-name wordgarden --file (Join-Path $projectRoot 'compose.yaml') stop
      if ($LASTEXITCODE -ne 0) { throw 'Docker stop failed.' }
    }
  } elseif ($Action -eq 'Reset') {
    if ($PSCmdlet.ShouldProcess('Wordgarden Compose stack and database volume', 'Delete containers, volume and local images')) {
      & docker compose --project-name wordgarden --file (Join-Path $projectRoot 'compose.yaml') down --volumes --rmi local
      if ($LASTEXITCODE -ne 0) { throw 'Docker cleanup failed. Local files were not removed.' }
    }
  }
  foreach ($target in $targets) {
    if ((Test-Path -LiteralPath $target) -and $PSCmdlet.ShouldProcess($target, 'Delete generated project files')) {
      Remove-GeneratedTree $target
    }
  }
} finally { Pop-Location }
if ($Action -eq 'Reset') { Write-Output 'To start fresh: docker compose up -d --build. For host development, also run npm ci.' }
