#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 / 26.04 server (run as root):  bash server-setup.sh
# Installs Node 22, pm2, PostgreSQL 18 (same major as the dev database), Redis, Caddy (HTTPS); swap, firewall (22/80/443), fail2ban, key-only SSH; makes the user "shop" and
# /srv/shop/secrets.env (random database password + JWT/webhook secrets, readable by root and shop only). Safe to run twice.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }
export DEBIAN_FRONTEND=noninteractive
say() { printf '\n==> %s\n' "$*"; }

say "packages"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg git ufw fail2ban unzip rsync build-essential python3 lsb-release apt-transport-https redis-server unattended-upgrades

say "swap (4 GB, only used when RAM runs out)"
if ! swapon --show | grep -q .; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf && sysctl -p /etc/sysctl.d/99-swap.conf >/dev/null
fi

say "Node 22 and pm2"
command -v node >/dev/null && node -v | grep -q '^v22' || { curl -fsSL https://deb.nodesource.com/setup_22.x | bash -; apt-get install -y nodejs; }
command -v pm2 >/dev/null || npm install -g pm2

say "PostgreSQL 18"
if ! command -v psql >/dev/null || ! psql --version | grep -q ' 18'; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y
  apt-get install -y postgresql-18 || apt-get install -y postgresql
fi
PGVER=$(ls /etc/postgresql | sort -n | tail -1)
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
cat > /etc/postgresql/$PGVER/main/conf.d/averixa.conf <<EOF
listen_addresses = '127.0.0.1'
max_connections = 120
shared_buffers = $((MEM_MB / 7))MB
effective_cache_size = $((MEM_MB / 2))MB
work_mem = 16MB
maintenance_work_mem = 256MB
EOF
systemctl restart postgresql

say "Redis (local only, 300 MB cache)"
sed -i 's/^# *bind 127.0.0.1.*/bind 127.0.0.1 -::1/' /etc/redis/redis.conf
grep -q '^maxmemory ' /etc/redis/redis.conf || printf 'maxmemory 300mb\nmaxmemory-policy allkeys-lru\n' >> /etc/redis/redis.conf
systemctl enable --now redis-server && systemctl restart redis-server

say "Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

say "user shop and secrets"
id shop >/dev/null 2>&1 || useradd -m -s /bin/bash -d /srv/shop shop
mkdir -p /srv/shop/app /srv/shop/backups && chown -R shop:shop /srv/shop
if [ ! -f /srv/shop/secrets.env ]; then
  umask 077
  printf 'DB_PASSWORD=%s\nJWT_SECRET=%s\nPAYMENT_WEBHOOK_SECRET=%s\n' "$(openssl rand -hex 24)" "$(openssl rand -hex 32)" "$(openssl rand -hex 24)" > /srv/shop/secrets.env
  chown root:shop /srv/shop/secrets.env && chmod 640 /srv/shop/secrets.env
fi
DBPW=$(grep '^DB_PASSWORD=' /srv/shop/secrets.env | cut -d= -f2-)
# the role is a superuser so the dumps copied from the PC (pg_trgm extension, owners) restore as they are; the database only listens on 127.0.0.1
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='shop') THEN CREATE ROLE shop LOGIN SUPERUSER; END IF; END \$\$;" -c "ALTER ROLE shop PASSWORD '$DBPW';"

say "firewall, fail2ban, key-only SSH"
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable
systemctl enable --now fail2ban
if [ -s /root/.ssh/authorized_keys ]; then
  printf 'PasswordAuthentication no\nPermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/00-averixa.conf
  systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
else
  echo "WARNING: /root/.ssh/authorized_keys is empty, password login left on"
fi

say "done"
echo "node $(node -v), pm2 $(pm2 -v), $(psql --version), redis $(redis-server -v | awk '{print $3}'), $(caddy version | head -1)"
echo "next: upload the code, then deploy/copy-databases.sh, then deploy/install-app.sh (see deploy/README.md)"
