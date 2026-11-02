# Packs the code of the chosen stores into one archive and uploads it to the server (run on the PC, in PowerShell, from the repo root):
#   .\deploy\pack.ps1 -Ip 76.13.209.242 -Stores main,attire
# Left out: node_modules, builds (.next*), git history, the dev database, logs, apps/api/.env (secrets stay on the PC), crawl data, the forks of the stores not chosen.
param(
  [Parameter(Mandatory = $true)][string]$Ip,
  [string[]]$Stores = @("main", "attire"),
  [string]$Key = "$env:USERPROFILE\.ssh\averixa_server"
)
$ErrorActionPreference = "Stop"
$Stores = @($Stores | ForEach-Object { $_ -split "," })   # "main,attire" given as one word also works
$keyArgs = @(); if (Test-Path $Key) { $keyArgs = @("-i", $Key) }   # without that key file the default ssh key is used
$root = Split-Path -Parent $PSScriptRoot
$reg = Get-Content (Join-Path $root "stores.json") -Raw | ConvertFrom-Json
$skip = @("node_modules", ".next*", ".git", ".pgdata", "*.log", ".watchdog*", "apps/api/.env", "apps/api/data", "domain details", "deploy/out")
foreach ($s in $reg.stores) { if ($s.webDir -and ($Stores -notcontains $s.slug)) { $skip += "apps/$($s.webDir)" } }
$tar = Join-Path $env:TEMP "averixa-code.tgz"
$ex = $skip | ForEach-Object { "--exclude=$_" }
Push-Location $root
try { & tar -czf $tar @ex . } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw "tar failed" }
"{0:N0} MB packed, uploading to $Ip ..." -f ((Get-Item $tar).Length / 1MB)
& scp @keyArgs -o StrictHostKeyChecking=accept-new $tar "root@${Ip}:/root/averixa-code.tgz"
if ($LASTEXITCODE -ne 0) { throw "upload failed" }
"uploaded. On the server run:  mkdir -p /srv/shop/app && tar -xzf /root/averixa-code.tgz -C /srv/shop/app && chown -R shop:shop /srv/shop"
