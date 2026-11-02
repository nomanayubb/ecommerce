#!/usr/bin/env bash
# Rebuilds the given apps on the SERVER after a code upload (deploy/update.ps1 calls this) with almost no downtime: the new build is made in .next-new while the shop keeps running,
# then swapped in (a few seconds) and the pm2 process restarted. Usage:  bash /srv/shop/app/deploy/update.sh web-attire web [admin ...]
# App folder -> pm2 name:  web -> web-main,  admin -> admin,  web-<x> -> web-<x>.   (The address files .env.production on the server are kept: update.ps1 does not upload them.)
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }
[ "$#" -ge 1 ] || { echo "usage: update.sh <app dir> [<app dir> ...]"; exit 1; }
APP=/srv/shop/app
chown -R shop:shop /srv/shop
for dir in "$@"; do
  name=$([ "$dir" = web ] && echo web-main || echo "$dir")
  [ -d "$APP/apps/$dir" ] || { echo "no such app: $dir"; exit 1; }
  echo "==> building apps/$dir"
  sudo -u shop bash -c "cd $APP/apps/$dir && rm -rf .next-new && NEXT_DIST_DIR=.next-new NODE_OPTIONS=--max-old-space-size=3072 npx next build" > "/root/update-$dir.log" 2>&1 || { echo "BUILD FAILED for $dir (the running shop was not touched):"; tail -n 25 "/root/update-$dir.log"; exit 1; }
  echo "==> swapping $dir"
  sudo -u shop bash -c "cd $APP/apps/$dir && rm -rf .next-old && mv .next .next-old && mv .next-new .next && pm2 restart $name --update-env"
done
sudo -u shop pm2 save >/dev/null
echo "UPDATE-OK: $*"
