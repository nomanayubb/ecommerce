# Remaining tasks

_Last updated: 2026-10-08. Update after every task (see `.claude/rules/workflow.md`)._

## Blockers
- Docker Desktop engine won't start (WSL VM stuck) -> worked around with embedded Postgres. Optional later: fix Docker or install Redis (Memurai) for caching.
- **EasyPaisa / JazzCash**: API access not available yet -> adapters deferred. Plug into `paymentInstructions()` in `apps/api/src/routes/checkout.ts`, add method to `ENABLED_PAYMENT_METHODS`.

## Design backlog (user request 2026-10-08)
- User said the earlier theme integration was premature: logo work comes first. The drawn SVG candidates (`brand/draw_logo.py`, `brand/drawn/`) were removed at the user's request 2026-10-08: not needed.

- **Logo v2 (flat black/gold, geometric wordmark)**: ask user to save the file (e.g. `brand/source/logo-v2.jpg`), run it through `brand/make_variants.py`, swap web/admin assets. User wants a combination: v2's clean wordmark/flat structure + v1's gold gradient depth and recognisable cart basket; drop v1's busy bevels/muddy mono and v2's weak cart + heavy black blocks. A true combined logo needs a designer or an image-generation model (ComfyUI pod costs money: stop it after use).
- Browser-verify admin pages, dark/OLED modes, mobile layout of the new theme.
- (done) Logo v1 received: brand kit generated, Averixa theme applied (charcoal/gold/cream), header/hero/footer redesigned.
- "100 beauty elements": grow `themes/` into a library of parametric elements (particles, corner art, dividers, badges, hover effects, backgrounds, cursor effects, banners, countdown ribbons...) grouped by occasion pack. Done so far: particles, corners, hero gradient (see `themes/types.ts`) and 5 packs.
- Admin: logo upload (DAM) instead of URL; pack list should come from one source (currently duplicated in admin settings page).
- Admin UI polish (currently functional/plain).

## Next up (in order)
1. (done 2026-10-08) DB running, API + web tested. Still untested: register/login flow by customer, wholesale pricing, webhook, browser UI (cart drawer, checkout form, theme toggle) — verify in a browser.
2. Add rate limiting on auth + checkout.
3. Seed script: add sample brands, products, variants, price tiers, images so the storefront isn't empty.
4. Admin panel extras: product edit page (variants, tiers, images), category tree manager, customers, RBAC UI.
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
- Sample seed data (12 products, 3-level categories, brands, variants, tiers).
- Admin panel v1 (`apps/admin`), settings/branding API, theme-pack system.

## Spec feature coverage (of 100)
Roughly 15 partially done (see CHANGELOG). Full spec is the user's original PRD; summary of deviations is in `docs/SPEC_NOTES.md`.
