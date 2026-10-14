# Starts the AVERIXA shop: database, API, storefront and admin. Anything already running is left alone.
# Run by hand, or automatically at Windows sign-in (scheduled task "AVERIXA Shop").
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $root "start-shop.log"
function Say($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m" | Out-File -FilePath $log -Append -Encoding utf8 }
function Up($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }
function Launch($dir, $cmd) { Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmd -WorkingDirectory (Join-Path $root $dir) -WindowStyle Hidden }
function WaitFor($port, $secs) { for ($i = 0; $i -lt $secs; $i += 2) { if (Up $port) { return $true }; Start-Sleep 2 }; return (Up $port) }

Say "start requested"
if (-not (Up 5432)) { Launch "apps\api" "node scripts/dev-db.mjs"; Say "database started: $(WaitFor 5432 60)" ; Start-Sleep 5 }
if (-not (Up 4000)) { Launch "apps\api" "npx tsx src/server.ts"; Say "api started: $(WaitFor 4000 90)" }
if (-not (Up 3000)) {
  $env:NEXT_DIST_DIR = ".next-prod"
  $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.1.*" } | Select-Object -First 1 -ExpandProperty IPAddress)
  if ($ip) { $env:NEXT_PUBLIC_API_URL = "http://${ip}:4000/api/v1" }
  Launch "apps\web" "npx next start -p 3000"; Say "storefront started: $(WaitFor 3000 90)"
}
if (-not (Up 3001)) { Launch "apps\admin" "npx next dev -p 3001"; Say "admin started: $(WaitFor 3001 120)" }
Say "done"
