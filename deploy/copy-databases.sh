#!/usr/bin/env bash
# Copies the databases of the PC (the dev Postgres, user shop) into this server through an SSH reverse tunnel (nothing is opened to the internet). Run on the SERVER as root:
#   bash /srv/shop/app/deploy/copy-databases.sh shop shop_attire        (names = "database" of the chosen stores in stores.json)
# Before that, on the PC (keep that window open until this finishes; the dev database must be running):
#   ssh -i $env:USERPROFILE\.ssh\averixa_server -R 15432:127.0.0.1:5432 root@<server IP>
# An existing database of the same name on the server is dropped and replaced (asked first).
set -euo pipefail
[ "$#" -ge 1 ] || { echo "usage: copy-databases.sh <db> [<db> ...]"; exit 1; }
PCPW=${PC_DB_PASSWORD:-shop}
export PGPASSWORD="$PCPW"
pg_isready -h 127.0.0.1 -p 15432 >/dev/null || { echo "the tunnel from the PC is not open (see the comment at the top of this file)"; exit 1; }
for db in "$@"; do
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
    read -r -p "database $db already exists on the server: replace it? [y/N] " yn; [ "$yn" = y ] || { echo "skipped $db"; continue; }
    sudo -u postgres dropdb --force "$db"
  fi
  sudo -u postgres createdb -O shop "$db"
  echo "copying $db ..."
  pg_dump -h 127.0.0.1 -p 15432 -U shop -Fc --no-owner "$db" | sudo -u postgres pg_restore --no-owner --role=shop -d "$db" --exit-on-error
  echo "$db: $(sudo -u postgres psql -d "$db" -tAc "SELECT count(*) FROM products") products"
done
