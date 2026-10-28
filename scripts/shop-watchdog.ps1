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

# ---- the other shops (stores.json): each with its own API (own database) and, if it has a "webDir" with a build, its own shop. Same rule as above: start what is down.
try {
  $reg = Get-Content (Join-Path $root "stores.json") -Raw | ConvertFrom-Json
  $envLine = @(Get-Content (Join-Path $root "apps\api\.env") | Where-Object { $_ -match '^DATABASE_URL=' })[0]
  $dbUrl = ($envLine -replace '^DATABASE_URL=', '').Trim()
  foreach ($st in $reg.stores) {
    if ($st.slug -eq "main" -or $st.slug -eq "dryfruits") { continue }
    if (-not (Up $st.apiPort)) {
      Note ("{0} API ({1}) down, starting" -f $st.slug, $st.apiPort)
      $u = [regex]::Replace($dbUrl, '/[^/]+$', "/$($st.database)")
      Start-Detached ('cmd.exe /c set PORT={0}&& set DATABASE_URL={1}&& npx tsx src/server.ts > ..\..\.api-{2}.out.log 2> ..\..\.api-{2}.err.log' -f $st.apiPort, $u, $st.slug) (Join-Path $root "apps\api")
      Start-Sleep -Seconds 12
    }
    if ($st.webDir) {
      $wd = Join-Path $root ("apps\" + $st.webDir)
      if ((-not (Up $st.webPort)) -and (Test-Path (Join-Path $wd ".next\BUILD_ID"))) {
        Note ("{0} shop ({1}) down, starting" -f $st.slug, $st.webPort)
        Start-Detached ('cmd.exe /c npx next start -p {0} -H 0.0.0.0 > ..\..\.web-{1}.out.log 2> ..\..\.web-{1}.err.log' -f $st.webPort, $st.slug) $wd
      }
    }
  }
} catch { Note ("other shops check failed: " + $_.Exception.Message) }
