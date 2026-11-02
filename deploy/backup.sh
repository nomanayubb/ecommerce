#!/usr/bin/env bash
# Daily database backup on the server: /srv/shop/backups/<db>-<date>.dump, the last 7 days are kept. Installed as a cron job by:  bash deploy/backup.sh --install
# (Copy /srv/shop/backups to your PC now and then: a backup on the same server does not help if the server itself is lost.)
set -euo pipefail
if [ "${1:-}" = "--install" ]; then
  echo "30 3 * * * root /bin/bash /srv/shop/app/deploy/backup.sh >> /var/log/averixa-backup.log 2>&1" > /etc/cron.d/averixa-backup
  echo "cron job installed (every day 03:30)"; exit 0
fi
DIR=/srv/shop/backups; mkdir -p "$DIR"
for db in $(sudo -u postgres psql -tAc "SELECT datname FROM pg_database WHERE datname LIKE 'shop%'"); do
  sudo -u postgres pg_dump -Fc "$db" > "$DIR/$db-$(date +%F).dump"
done
find "$DIR" -name '*.dump' -mtime +7 -delete
chown -R shop:shop "$DIR"
echo "$(date -Is) backup ok: $(ls "$DIR" | wc -l) files"
