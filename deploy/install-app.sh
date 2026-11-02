#!/usr/bin/env bash
# Builds and starts the live site (run on the SERVER as root, after server-setup.sh, the code upload and copy-databases.sh):
#   bash /srv/shop/app/deploy/install-app.sh averixa.pk main,attire
# Steps: generate the server files -> npm install -> write each app's addresses -> next build of every shop + the admin -> Caddy + hosts -> pm2 (starts at boot) -> shop links (scripts/store-links.ts).
# Takes about 10-15 minutes the first time (the builds). Run it again after every code upload.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }
DOMAIN=${1:?"usage: install-app.sh <domain> <stores, e.g. main,attire>"}
STORES=${2:-main,attire}
APP=/srv/shop/app
cd "$APP"
say() { printf '\n==> %s\n' "$*"; }

say "server files"
node deploy/generate.mjs --domain "$DOMAIN" --stores "$STORES" --app "$APP"
cp deploy/out/stores.json stores.json
cp deploy/out/admin-stores.json apps/admin/public/stores.json
chown -R shop:shop /srv/shop

say "npm install (as user shop; the lockfile does not list the copied shop forks, so npm ci would refuse)"
sudo -u shop bash -c "cd $APP && npm install --no-audit --no-fund"

say "builds"
while read -r dir; do
  [ -n "$dir" ] || continue
  cp "deploy/out/env/$dir.env.production" "apps/$dir/.env.production"
  chown shop:shop "apps/$dir/.env.production"
  echo "--- building apps/$dir"
  sudo -u shop bash -c "cd $APP/apps/$dir && rm -rf .next && NODE_OPTIONS=--max-old-space-size=3072 npx next build"
done < deploy/out/apps.txt

say "Caddy and hosts"
cp deploy/out/Caddyfile /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy
sed -i '/# averixa-begin/,/# averixa-end/d' /etc/hosts
{ echo "# averixa-begin"; cat deploy/out/hosts.txt; echo "# averixa-end"; } >> /etc/hosts

say "pm2"
sudo -u shop bash -c "cd $APP && pm2 delete all >/dev/null 2>&1 || true; pm2 start deploy/out/ecosystem.config.cjs && pm2 save"
env PATH=$PATH:/usr/bin pm2 startup systemd -u shop --hp /srv/shop >/dev/null 2>&1 || true
systemctl enable pm2-shop >/dev/null 2>&1 || true

say "links between the shops"
PW=$(grep '^DB_PASSWORD=' /srv/shop/secrets.env | cut -d= -f2-)
sudo -u shop bash -c "cd $APP/apps/api && DATABASE_URL=postgres://shop:$PW@127.0.0.1:5432/shop npx tsx scripts/store-links.ts" || echo "store-links failed (not important now, run it later)"

say "status"
sudo -u shop pm2 status
echo "open: https://$DOMAIN  (admin: https://admin.$DOMAIN)"
