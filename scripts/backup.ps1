param([string]$OutputDirectory = (Join-Path $PSScriptRoot '..\backups'))
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$backupPath = Join-Path (Resolve-Path $OutputDirectory) ("wordgarden-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.sql')
# Out-File is text-safe here; pg_dump emits UTF-8 SQL. No binary dump is piped through PowerShell.
docker compose exec -T db pg_dump -U wordgarden wordgarden | Out-File -LiteralPath $backupPath -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'Backup failed.' }
Write-Output $backupPath
