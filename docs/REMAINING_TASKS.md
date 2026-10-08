# Remaining tasks

_Last updated: 2026-10-08. Update after every task (see `.claude/rules/workflow.md`)._

## Blockers
- Docker Desktop engine won't start (WSL VM stuck) -> worked around with embedded Postgres. Optional later: fix Docker or install Redis (Memurai) for caching.
- **EasyPaisa / JazzCash**: API access not available yet -> adapters deferred. Plug into `paymentInstructions()` in `apps/api/src/routes/checkout.ts`, add method to `ENABLED_PAYMENT_METHODS`.

## Next up (in order)
1. (done 2026-10-08) DB running, API + web tested. Still untested: register/login flow by customer, wholesale pricing, webhook, browser UI (cart drawer, checkout form, theme toggle) — verify in a browser.
2. Add rate limiting on auth + checkout.
3. Seed script: add sample brands, products, variants, price tiers, images so the storefront isn't empty.
4. Admin panel (`apps/admin`): products CRUD, category tree manager, orders list/status, bulk edit grid.
5. Typesense: index sync worker + switch `GET /products` to it (keep Postgres fallback).
6. Storefront gaps: faceted filter sidebar, quick view, compare, wishlist, search dropdown, account/orders pages, order tracking, 4-level mega menu, announcement bar, currency switcher, PWA.
7. Mascot component (spec section 4A) — wire to cart events.
8. Checkout: guest account creation, coupon engine, multi-address (B2B).
9. Admin: theme engine/Monaco editor (spec §5, sandbox the compile step), RBAC UI, audit log, webhooks, courier APIs (TCS/Leopard).
10. Security/ops: rate limiting, refresh-token revocation, audit trail table, backups, CI.

## Done
- Monorepo scaffold, docker-compose, DB schema + migration runner (fixed spec bugs).
- API: auth, catalog, cart validate, checkout (stock locking), basic admin, payment-method gate.
- Web: layout/theme toggle/mega menu, product list, PDP, cart drawer, COD checkout.
- Project docs + rules (this set of files).

## Spec feature coverage (of 100)
Roughly 15 partially done (see CHANGELOG). Full spec is the user's original PRD; summary of deviations is in `docs/SPEC_NOTES.md`.
