# Changelog

Newest at the bottom. One entry per task. State what was verified and what was not.

## 2026-10-07 — Foundation (API, DB, infra)
- Created monorepo (`package.json` workspaces), `docker-compose.yml` (Postgres 16, Redis 7, Typesense 27), `.gitignore`.
- `apps/api`: Fastify server, JWT auth (register/login/refresh), catalog (list/detail/category tree, Redis-cached), cart validate + checkout (server-side pricing, `FOR UPDATE` stock locking, stock decrement), payments webhook (HMAC), basic admin routes (product create, bulk edit, orders, status, analytics).
- `migrations/001_init.sql`: schema from the spec with fixes (`model_3d_url` rename, stock columns, `price_tiers`, constraints, one-active-theme index).
- Verified: `tsc --noEmit` passes. NOT run against a database.

## 2026-10-07 — Payment gate + storefront
- Checkout rejects methods not in `ENABLED_PAYMENT_METHODS` (default `COD`) so no unpayable orders reserve stock.
- `apps/web`: Next.js 15 storefront — layout with theme toggle (no FOUC), mega menu (3 levels), product list (URL-driven filters/pagination), PDP (variants, tier table, JSON-LD), cart drawer (localStorage, free-shipping bar), COD checkout.
- Verified: `tsc --noEmit` passes (web + api). NOT run in a browser.

## 2026-10-07 — Docker troubleshooting
- Docker Desktop failed: stale `sailor-ingest.sock` (needed admin), then missing WSL2 kernel (`wsl --update` done by user), then engine VM stuck. No project files changed. Decision: move to native Postgres/Redis.

## 2026-10-07 — Docs, rules, memory system
- Added `CLAUDE.md`, `.claude/rules/{efficiency,workflow,git}.md`, `docs/{ARCHITECTURE,REMAINING_TASKS,CHANGELOG,SPEC_NOTES}.md`. Initialised git repo locally.

## 2026-10-08 — GitHub connected
- Added remote `origin` (https://github.com/nomanayubb/ecommerce) and pushed `main`. Verified: push succeeded.

## 2026-10-08 — Local stack running + tested
- winget Postgres installer 403'd and Docker engine is stuck -> added `embedded-postgres` (devDep of api), `apps/api/scripts/dev-db.mjs` (`npm run dev:db -w api`), data in git-ignored `apps/api/.pgdata`.
- Migration: replaced `uuid_generate_v4()` with built-in `gen_random_uuid()` and dropped the uuid-ossp extension (not in embedded builds). `.env.example` DB creds now shop/shop (dev).
- `lib/redis.ts`: `enableOfflineQueue:false` so a missing Redis fails fast instead of queueing.
- Verified against the real running API: migrate+seed, admin login, product create with tier, tier pricing (2 x 1000 + 250 ship), over-stock rejected (409), EASYPAISA rejected by gate, 5 concurrent COD orders on stock 3 -> 3x201 + 2x409, stock ends at 0, wholesale_price not leaked, admin orders list.
- Verified storefront (next dev): `/`, `/products`, `/products?q=`, `/products/[slug]`, `/checkout` all return 200 with real data. NOT verified in a browser (JS interactions).

## 2026-10-08 — Seed data, admin panel, branding + theme packs
- `seed.ts`: idempotent; admin created once (RESET_ADMIN=1 reissues password); 12 products, brands, 3-level categories, variants, price tiers (picsum.photos placeholder images).
- API: `GET /admin/products`, `GET /settings` (public), `PUT /admin/settings` (ADMIN+, zod: hex colors, http(s)/relative logo URL only), migration `002_site_settings.sql` (`site_settings` key/value; `branding` row; includes `pack`).
- `apps/admin` (port 3001): sessionStorage JWT login, dashboard, products (inline bulk edit of price/stock/status), new product form, orders (status change), Brand & theme settings.
- `apps/web`: layout reads branding -> injects CSS vars (brand colors, radius, font), logo in header, announcement bar; `src/themes/` pack system (5 occasion packs) + `Decor` particles/corner component.
- Verified live: validation rejects `javascript:` logo and bad colors; unauthenticated PUT -> 401; switching to Halloween via the admin API changed the rendered storefront (brand color, dark default, serif font, announcement, 28 decor nodes) after the 30s ISR window; admin login page 200. tsc clean in api/web/admin.
- NOT verified: admin pages in a real browser (login flow, grid save, order status UI), mobile layout.

## 2026-10-08 — Averixa brand kit + theme
- `brand/make_variants.py`: from the logo JPG builds 10 variants (transparent lockup/mark, horizontal, mono, white reverse, app icon, badge, stacked-on-dark) + web assets (webp mark/lockups, favicon.ico, icons 192/512, og-image) + contact sheet. Alpha is derived from distance to the cream background with colour un-premultiply (no halo). Navy mono variant is muddy; not used.
- Theme: new palette tokens (charcoal brand, gold accent, cream bg, dark/OLED), `--on-brand` auto-contrast (`lib/branding.ts onBrand`), Tailwind `onbrand`/`accent` colours; header logo mark + letterspaced wordmark + gold hairline; hero redesigned (gradient, tagline eyebrow, gold CTA, logo art); footer component; product card hover lift; admin sidebar/login logos; favicon/OG metadata.
- `seed.ts` sets Averixa branding while the settings row is still the untouched default.
- Verified: tsc clean (web/admin/api); services restarted; home page screenshot in the in-app browser shows the new theme. Fixed hero logo being clipped at the right edge. NOT verified: other pages visually, dark/OLED, mobile, admin pages in a browser.

## 2026-10-08 - Drawn logo candidates (logo work only)
- `brand/draw_logo.py` draws the Averixa logo as SVG (gold A whose right leg becomes a gridded cart, geometric AVERIXA wordmark, tagline): `brand/drawn/averixa-{stacked-color,horizontal-color,stacked-on-dark,app-icon,mark}.svg` + `index.html` preview. Combines v1 (clear cart, gold depth) with v2 (flat, geometric). Viewed in the in-app browser; wordmark spacing/tips and cart stroke weights were fixed after the first render.
- Site was NOT changed by this step. Tagline is live SVG text (convert to outlines for final print use). Not yet chosen/approved by the user.

## 2026-10-08 - Removed drawn logo candidates
- Deleted `brand/draw_logo.py` and `brand/drawn/*` (SVG candidates + preview) at the user's request; they are not needed. The brand kit (`brand/make_variants.py`, `brand/out/`) is unchanged.
- Also set aside (git stash `20:11 rollback of theme files`) an uncommitted rollback of the theme files so the working tree matches `main` again.
