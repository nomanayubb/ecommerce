# Sends the CODE (no photos, no secrets, no address files) to the server and rebuilds the apps you name, nearly without downtime (run on the PC from the repo root):
#   .\deploy\update.ps1 -Apps web,web-attire          (app folders under apps/: web = main shop, web-attire, web-electronics, web-mobiles, web-autoparts, admin)
# Upload is a few MB. Photos stay on the server (a new photo folder needs deploy\pack.ps1 or a single scp of the new files).
param(
  [Parameter(Mandatory = $true)][string[]]$Apps,
  [string]$Ip = "76.13.209.242",
  [string]$Key = "$env:USERPROFILE\.ssh\averixa_server",
  [switch]$UploadOnly   # only send and unpack the code (first install of a NEW app: its address file and pm2 entry must exist before the first build)
)
$ErrorActionPreference = "Stop"
$Apps = @($Apps | ForEach-Object { $_ -split "," })
$keyArgs = @(); if (Test-Path $Key) { $keyArgs = @("-i", $Key) }
$root = Split-Path -Parent $PSScriptRoot
$skip = @("node_modules", ".next*", ".git", ".pgdata", "*.log", ".watchdog*", "apps/api/.env", "apps/api/data", "domain details", "deploy/out", ".env.production", "stores.json", "public/cs", "public/kk", "public/areas", "public/streets", "public/photos", "brand-source")
$tar = Join-Path $env:TEMP "averixa-code-only.tgz"
$ex = $skip | ForEach-Object { "--exclude=$_" }
Push-Location $root
try { & tar -czf $tar @ex . } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw "tar failed" }
"{0:N1} MB packed, uploading ..." -f ((Get-Item $tar).Length / 1MB)
& scp @keyArgs -o StrictHostKeyChecking=accept-new $tar "root@${Ip}:/root/averixa-code-only.tgz"
if ($LASTEXITCODE -ne 0) { throw "upload failed" }
$list = $Apps -join " "
if ($UploadOnly) { & ssh @keyArgs -o ConnectTimeout=20 "root@$Ip" "mkdir -p /srv/shop/app && tar -xzf /root/averixa-code-only.tgz -C /srv/shop/app && chown -R shop:shop /srv/shop/app && echo UPLOAD-OK"; return }
& ssh @keyArgs -o ConnectTimeout=20 -o ServerAliveInterval=15 "root@$Ip" "mkdir -p /srv/shop/app && tar -xzf /root/averixa-code-only.tgz -C /srv/shop/app && bash /srv/shop/app/deploy/update.sh $list"
