# Keeps the shop (port 3000) and the API (port 4000) running. Run every minute by the Windows scheduled task "AVERIXA shop watchdog".
# If a port has no listener it starts that server again (detached, same way as by hand). To stop it temporarily (for example during a build swap),
# create the file .watchdog-pause in the repo root; delete it to resume. Log: .watchdog.log (only restarts are written).
$root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $root ".watchdog.log"
if (Test-Path (Join-Path $root ".watchdog-pause")) { exit 0 }

function Note($m) { Add-Content -Path $log -Value ("{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $m) }
function Up($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }
function Start-Detached($cmd, $dir) { Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd; CurrentDirectory = $dir } | Out-Null }

if (-not (Up 5432)) { Note "database (5432) is down, not started by the watchdog"; exit 0 }

if (-not (Up 4000)) {
  Note "API (4000) down, starting"
  Start-Detached 'cmd.exe /c npx tsx src/server.ts > ..\..\.api.out.log 2> ..\..\.api.err.log' (Join-Path $root "apps\api")
  Start-Sleep -Seconds 15
}

if (-not (Up 3000)) {
  $web = Join-Path $root "apps\web"
  $dirs = ".next-new", ".next-prod" | Where-Object { Test-Path (Join-Path $web "$_\BUILD_ID") } | Sort-Object { (Get-Item (Join-Path $web "$_\BUILD_ID")).LastWriteTime } -Descending
  if ($dirs) {
    $d = @($dirs)[0]
    Note "shop (3000) down, starting from $d"
    Start-Detached "cmd.exe /c set NEXT_DIST_DIR=$d&& npx next start -p 3000 -H 0.0.0.0 > ..\..\.web.out.log 2> ..\..\.web.err.log" $web
  } else { Note "shop (3000) down but no production build found" }
}
