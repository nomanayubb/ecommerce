# Architecture — how the whole project works

Read only the section you need. Update the section when its code changes.

## 1. Overview
```
Browser ── Next.js storefront (apps/web, :3000) ──HTTP──> Fastify API (apps/api, :4000/api/v1)
                                                              ├─ PostgreSQL (system of record)
                                                              ├─ Redis (catalog/analytics cache; best-effort)
                                                              └─ Typesense (planned search index; not wired)
```
One API process with route modules (not separate microservices). Web calls the API server-side (server components, ISR via `next.revalidate`) and client-side only for checkout/cart actions.

## 2. Running it
Env: `apps/api/.env` (git-ignored; template `apps/api/.env.example`) — `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `PORT`, `ENABLED_PAYMENT_METHODS`, optional `PAYMENT_WEBHOOK_SECRET`. Web: `apps/web/.env.local` — `NEXT_PUBLIC_API_URL`.
Commands (repo root): `npm run infra` (docker compose), `npm run migrate`, `npm run seed -w apps/api`, `npm run dev:api`, `npm run dev -w web`.
Type-check: `npx tsc --noEmit` inside each app.
Without Docker: native Postgres (db/user `shop`) + Redis-compatible server on default ports.

## 3. API (`apps/api/src`)
| File | Purpose |
|---|---|
| `server.ts` | Builds Fastify, CORS, JWT plugin (payload `{sub, role, wholesale}`), central error handler (`CartError`→status, zod→400, else 500 generic), mounts route modules. |
| `migrate.ts` | Applies `migrations/*.sql` in name order, tracked in `_migrations`, each in a transaction. |
| `seed.ts` | Dev seed: SUPER_ADMIN `admin@example.com` with a random password printed once; sample categories. |
| `lib/db.ts` | `pg.Pool` from `DATABASE_URL` (also loads dotenv). |
| `lib/redis.ts` | `redis` client, `cached(key, ttl, fn)` (failures fall through to DB), `delPattern`. |
| `lib/pricing.ts` | **Single source of pricing/stock truth.** `priceCart(db, items, {wholesale, lock})`: loads published products/variants (optionally `FOR UPDATE`), enforces MOQ + stock, unit price = min(base/variant price, wholesale price if approved wholesale, best matching `price_tiers`), shipping = 0 if subtotal ≥ 5000 PKR else 250. Throws `CartError`. |
| `routes/auth.ts` | `POST /auth/register` (bcrypt 12, role fixed CUSTOMER, wholesale applicant → PENDING), `/login`, `/refresh`. Access token 15m, refresh 30d. |
| `routes/catalog.ts` | `GET /products` (filters q/category(recursive)/brand/price/inStock/tag, sort, pagination, Redis 60s), `GET /products/:slug` (variants + tiers; strips `wholesale_price`), `GET /categories/tree` (Redis 300s). |
| `routes/checkout.ts` | `POST /cart/validate` (priced preview), `POST /checkout/process` (gate by `ENABLED_PAYMENT_METHODS`; one transaction: price with locks → insert order + items → decrement stock → commit → clear `catalog:*` cache; guest allowed, JWT optional), `POST /payments/webhook` (HMAC-SHA256 of body vs `x-signature`, marks order PAID/FAILED, idempotent on UNPAID). `paymentInstructions()` is the gateway adapter seam. |
| `routes/admin.ts` | `onRequest` hook: JWT + role in SUPER_ADMIN/ADMIN/WAREHOUSE. WAREHOUSE blocked from product create. `POST /admin/products` (with categories, variants, tiers), `PUT /admin/products/bulk`, `GET /admin/orders`, `PATCH /admin/orders/:id/status`, `GET /admin/analytics/summary` (30d, Redis 30s). |

Database (`migrations/001_init.sql`): users, categories (self-ref tree), brands, products, product_categories, product_variants, price_tiers, orders, order_items, themes. Enums: user_role, order_status, payment_status. See `SPEC_NOTES.md` for differences from the original spec.

Order flow: client sends `{productId, variantId?, quantity}` only → server re-prices → order PENDING/UNPAID → COD stays unpaid until delivery; gateways (future) flip to PAID via webhook.

## 4. Storefront (`apps/web/src`)
| File | Purpose |
|---|---|
| `app/layout.tsx` | Fetches category tree (ISR 300s), inline script applies saved theme before paint (no FOUC), wraps `CartProvider`, `Header`, `CartDrawer`. |
| `app/globals.css`, `tailwind.config.ts` | Design tokens as CSS variables (`--bg --fg --muted --card --line --brand`), themes via `data-theme` = light / dark / oled. |
| `app/page.tsx` | Home: hero + 8 newest products. |
| `app/products/page.tsx` | Listing; filters/sort/pagination live in URL query (`q, category, sort, inStock, page`). |
| `app/products/[slug]/page.tsx` | PDP: gallery, JSON-LD Product, `BuyPanel`. |
| `app/checkout/page.tsx` | Client form → `POST /checkout/process` with COD; shows order number. |
| `components/CartProvider.tsx` | Cart state in React context + `localStorage` (`cart` key). Display prices only; server re-prices. |
| `components/CartDrawer.tsx` | Slide-out cart, free-shipping bar (threshold 5000 mirrors API constant). |
| `components/Header.tsx` | Mega menu, search form, theme toggle, cart button. |
| `components/BuyPanel.tsx` | Variant picker, qty, tier-price preview, low-stock note, add to cart. |
| `components/ProductCard.tsx` | Grid card with discount badge. |
| `lib/api.ts` | `api()` fetch wrapper (GET → ISR revalidate, others no-store), shared types, `pkr()` formatter. |

## 4b. Branding + theme packs
- DB `site_settings(key,value jsonb)`; row `branding` = {name, tagline, logoUrl, brandColor, brandColorDark, radius, font(system|serif|rounded|mono), defaultTheme, announcement, pack}. API `routes/settings.ts` (zod schema, Redis cache 60s, public `GET /settings`); `PUT /admin/settings` in `routes/admin.ts`.
- Web: `app/layout.tsx` -> `themes/index.ts applyPack()` merges the active pack's tokens over saved branding -> `lib/branding.ts brandingCss()` emits `html:root{--brand,--radius,--font}` + dark/oled brand override (specificity beats globals.css) -> `Decor` renders pack particles/corners (CSS-only, deterministic, hidden for reduced-motion). Tailwind `rounded*` use `--radius`.
- Add an occasion: new `themes/packs/<id>.ts` (type `Pack` in `themes/types.ts`), register in `themes/index.ts`, add to `PACKS` list in `apps/admin/src/app/settings/page.tsx`.
- Storefront caches settings 30s (`revalidate`), so changes appear within ~30s.

## 4c. Admin (`apps/admin/src`)
`components/Shell.tsx` (auth gate by sessionStorage token, sidebar), `lib/api.ts` (fetch with bearer, 401 -> /login), pages: `login`, `/` dashboard, `products` (+`/new`), `orders`, `settings`. Staff-only; WAREHOUSE cannot create products or change settings.

## 4d. Brand, tokens, logo pipeline
Design tokens live in `apps/{web,admin}/src/app/globals.css` (identical core). `lib/branding.ts brandingCss()` overrides `--brand/--on-brand/--accent/--radius/--font` from DB branding (`accentColor`, `logoUrlDark` included). Logos: `components/Header.tsx <Logo>` renders light + dark `<img>`; CSS shows the right one per `data-theme`. Assets built by `scripts/build-brand.py` from `brand-source/logo.jpg`.

## 5. Known gaps / traps
- Free-shipping threshold and flat fee are duplicated in `lib/pricing.ts` and `CartDrawer.tsx`; move to a settings table when admin exists.
- Cart drawer shows client-side prices; fine because checkout re-prices, but cart validation on open is a TODO.
- Refresh tokens are not revocable yet.
- No rate limiting yet (needed on auth + checkout).
- Nothing has been executed end-to-end yet (see `REMAINING_TASKS.md`).
