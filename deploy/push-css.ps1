# Sends the two plain stylesheets (live-fx.css = your design tweaks, card-fx.css = card hover/buttons) of the chosen shops to the live server: about 2 seconds, NO build, NO restart.
#   .\deploy\push-css.ps1                       (all five shops)
#   .\deploy\push-css.ps1 -Apps web-attire      (one shop)
# Only edits of these two existing files go live this way. TSX / new files / the main stylesheet still need deploy\update.ps1.
param(
  [string[]]$Apps = @("web", "web-attire", "web-electronics", "web-mobiles", "web-autoparts"),
  [string]$Ip = "76.13.209.242",
  [string]$Key = "$env:USERPROFILE\.ssh\averixa_server"
)
$ErrorActionPreference = "Stop"
$Apps = @($Apps | ForEach-Object { $_ -split "," })
$keyArgs = @(); if (Test-Path $Key) { $keyArgs = @("-i", $Key) }
$root = Split-Path -Parent $PSScriptRoot
$files = @()
foreach ($a in $Apps) { foreach ($f in "live-fx.css", "card-fx.css") { $p = Join-Path $root "apps/$a/public/$f"; if (Test-Path $p) { $files += @{ local = $p; remote = "/srv/shop/app/apps/$a/public/$f" } } } }
foreach ($f in $files) { & scp @keyArgs -o ConnectTimeout=20 $f.local "root@${Ip}:$($f.remote)"; if ($LASTEXITCODE -ne 0) { throw "upload failed: $($f.local)" } }
& ssh @keyArgs -o ConnectTimeout=20 "root@$Ip" "chown shop:shop /srv/shop/app/apps/*/public/*-fx.css"
"CSS-OK: $($files.Count) files live (reload the page; Cloudflare may show the old copy for up to a minute)"
