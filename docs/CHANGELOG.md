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

## 2026-10-08 — AVERIXA logo pipeline + black/gold luxury theme
- User clarified: the 20:11 rollback of the other session's theme was THEIR deliberate rewind (I had wrongly stashed it, then restored it via `git stash pop`; docs conflicts resolved to the rewound versions). Also removed `brand/draw_logo.py` and `brand/drawn/` at their request.
- Logo: `scripts/build-brand.py` (source `brand-source/logo.jpg`) -> transparent, cropped, per-theme logos in `apps/*/public/brand/` (header lockup 14KB WebP vs 126KB original JPEG), favicon, apple-touch/192/512 icons, 1200x630 og-image.
- Theme: new tokens in both `globals.css` (cream light, charcoal dark default, OLED), `--on-brand` auto-contrast, `--accent`; utility classes (`.btn`, `.eyebrow`, `.gold-rule`, `.lift`); Tailwind `onbrand`/`accent` colours.
- Storefront: header (logo swaps per theme, uppercase nav, mega menu, mobile `<details>` menu, bag badge, 3-state theme toggle), hero with logo-inspired line art, category tiles, product cards, brand promise, footer (perks strip, shop links, payment). Metadata: title template, OG/Twitter, icons, viewport theme colour.
- API: branding schema + `accentColor`, `logoUrlDark`; migration `003_averixa_branding.sql` sets AVERIXA defaults. Admin: dark default, logos on sign-in + sidebar, accent/dark-logo fields in Brand & theme.
- Verified: tsc clean (api/web/admin); API restarted, `/settings` returns AVERIXA; screenshots of storefront home (hero, categories) and admin sign-in look correct in the in-app browser. NOT verified: PDP, product list, cart drawer, checkout, light/OLED modes, mobile, admin inner pages.

## 2026-10-08 — Professional storefront pass (inner pages)
- User approved the logo as is (no more optimizing; AI-logo pod run cancelled, pod never started).
- Web: `/products` rewritten (breadcrumbs w/ JSON-LD, category tree + sort + price + in-stock sidebar, mobile `<details>` filters, empty state, pagination); product page (`Gallery` with hover zoom + thumbs, `BuyPanel` with option picker, qty stepper, live tier-price table, stock status, sticky mobile add-to-bag bar, accordion details, related products, Product JSON-LD, per-product metadata); `CartDrawer` (a11y dialog, Esc to close, remove, free-delivery bar); `/checkout` (server-priced summary via `/cart/validate`, payment cards with EasyPaisa/JazzCash/Card as "coming soon", confirmation screen); `not-found`, `loading` skeleton, `error` boundary; `Breadcrumbs` component.
- Placeholder product art: `app/ph/[slug]/route.ts` serves on-brand SVGs (`/ph/<slug>?ar=4x3&v=2`); seed now uses them (and updates images on re-seed). Old test product `test-phone` archived.
- Verified in the in-app browser with real clicks: desktop list/PDP, picked size M + qty 12 -> tier price Rs. 1,299 each = Rs. 15,588, bag drawer, cart persisted across navigation (localStorage), checkout form -> COD order #4 placed -> confirmation; mobile (375px) PDP with sticky bar. tsc clean. Fixed: bag badge wrapping on mobile.
- NOT verified: light/OLED modes, tablet widths, quick checks of error/loading states, admin inner pages.
