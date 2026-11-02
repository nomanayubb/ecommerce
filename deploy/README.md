# Going live (VPS + Cloudflare)

Plan: one Ubuntu VPS (Hostinger KVM 2, Indonesia, 76.13.209.242) runs everything with pm2: per store one API and one shop, plus one admin. Caddy gives HTTPS and routes the host names. Cloudflare (free) sits in front of the domain `averixa.pk` and serves images / CSS / JS from its Pakistan servers.

Host names (made by `deploy/generate.mjs`): `averixa.pk` (main shop), `attire.averixa.pk`, `api.averixa.pk` (main API), `api-attire.averixa.pk`, `admin.averixa.pk`. Start with `main,attire`; more stores later = run `install-app.sh` again with a longer list (and copy their databases).

Nothing in `deploy/` touches the PC's running shop. The PC key `~/.ssh/averixa_server` never leaves the PC; the server only holds the public half.

## 1. Cloudflare and DNS (owner, once)
1. Cloudflare: add site `averixa.pk` (Free). At PKNIC replace the name servers with the two Cloudflare gave.
2. In Cloudflare DNS add **A records** to `76.13.209.242` (Proxied / orange cloud): `@`, `www`, `attire`, `api`, `api-attire`, `admin`.
3. SSL/TLS mode: **Full (strict)** (Caddy gets its own certificate; this works while the orange cloud is on). Turn "Always Use HTTPS" on.

## 2. Server, once (PowerShell on the PC, then on the server)
```powershell
scp -i $env:USERPROFILE\.ssh\averixa_server -r deploy root@76.13.209.242:/root/
ssh -i $env:USERPROFILE\.ssh\averixa_server root@76.13.209.242 "bash /root/deploy/server-setup.sh"
```

## 3. Code
```powershell
.\deploy\pack.ps1 -Ip 76.13.209.242 -Stores main,attire
ssh -i $env:USERPROFILE\.ssh\averixa_server root@76.13.209.242 "mkdir -p /srv/shop/app && tar -xzf /root/averixa-code.tgz -C /srv/shop/app && chown -R shop:shop /srv/shop"
```

## 4. Databases (PC database must be running)
Terminal A on the PC (leave open): `ssh -i $env:USERPROFILE\.ssh\averixa_server -R 15432:127.0.0.1:5432 root@76.13.209.242`
In that session on the server: `bash /srv/shop/app/deploy/copy-databases.sh shop shop_attire`

## 5. Build and start
On the server: `bash /srv/shop/app/deploy/install-app.sh averixa.pk main,attire` (10-15 min), then `bash /srv/shop/app/deploy/backup.sh --install` (daily database backup).

## After
- Open https://averixa.pk, https://attire.averixa.pk (hidden from menus until the owner opens it), https://admin.averixa.pk. The admin login is the same as on the PC: change its password at once.
- Code update later: step 3 again (pack + extract), then `install-app.sh` again.
- Logs: `sudo -u shop pm2 logs <name>`; restart: `sudo -u shop pm2 restart all`.
- Not set yet: email sending, EasyPaisa/JazzCash, per-IP rate limit (the API does not read the real client address behind Caddy/Cloudflare yet), Cloudflare cache rules beyond the headers Caddy sends.
