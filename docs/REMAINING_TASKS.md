# Remaining tasks

_Last updated: 2026-10-08. Update after every task (see `.claude/rules/workflow.md`)._

## Blockers
- Docker Desktop engine won't start (WSL VM stuck) -> worked around with embedded Postgres. Optional later: fix Docker or install Redis (Memurai) for caching.
- **EasyPaisa / JazzCash**: API access not available yet -> adapters deferred. Plug into `paymentInstructions()` in `apps/api/src/routes/checkout.ts`, add method to `ENABLED_PAYMENT_METHODS`.

## Design backlog (user request 2026-10-08)
- (done 2026-10-08) AVERIXA black/gold theme + professional storefront: home, product list (filter sidebar), product page (gallery, tiers, sticky mobile bar), bag drawer, checkout, 404/loading/error. User decided the logo is fine as is (no further optimizing, no AI-logo pod run). Still to do: light/OLED visual check, tablet widths, admin inner pages polish, delete unused v1 logo assets (`brand/`, `apps/*/public/logo-*.webp`), real product photos (currently on-brand SVG placeholders at `/ph/<slug>`).
- "100 beauty elements": grow `themes/` into a library of parametric elements (particles, corner art, dividers, badges, hover effects, backgrounds, cursor effects, banners, countdown ribbons...) grouped by occasion pack. Done so far: particles, corners, hero gradient (see `themes/types.ts`) and 5 packs.
- Admin: logo upload (DAM) instead of URL; pack list should come from one source (currently duplicated in admin settings page).
- Admin UI polish (currently functional/plain).

## Feature backlogs (user lists, 2026-10-08): read only the one you are working on
- `docs/FEATURES_VISUAL_100.md` (visual/product/cart/search/account/trust/technical), `docs/FEATURES_THEME_100.md` (section library + theme settings), `docs/FEATURES_KITCHEN_130.md` (kitchen, icons, mascot, 3D, brand magic; open question: is the store kitchen-focused?).
- ALL must follow `docs/DESIGN_SYSTEM_RULES.md` (one coherent system aligned with the logo; palette table there). Suggested batching: (1) premium-feel visuals + shared icon set + motion setting, (2) product experience, (3) mascot/3D, (4) account/engagement (needs backend), (5) section/theme editor.

## Next up (in order)
1. (done 2026-10-08) DB running, API + web tested. Still untested: register/login flow by customer, wholesale pricing, webhook, browser UI (cart drawer, checkout form, theme toggle) — verify in a browser.
2. Add rate limiting on auth + checkout.
3. Seed script: add sample brands, products, variants, price tiers, images so the storefront isn't empty.
4. Admin panel extras: product edit page (variants, tiers, images), category tree manager, customers, RBAC UI.
5. Typesense: index sync worker + switch `GET /products` to it (keep Postgres fallback).
6. Storefront gaps: brand filter + search dropdown, quick view, compare, wishlist, search dropdown, account/orders pages, order tracking, 4-level mega menu, announcement bar, currency switcher, PWA.
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

- Make the theme fully swappable for the next project: remove the hard-coded brand values listed in `docs/NEW_PROJECT_GUIDE.md`, add font-pairing presets, extend branding settings (hero style, footer content, free-delivery threshold, copy). User requirement 2026-10-08.
