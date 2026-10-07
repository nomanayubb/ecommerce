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
