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

## 4e. Storefront pages (professional pass)
`/products` (server): filters live in the URL, category tree from `/categories/tree`. `/products/[slug]`: `Gallery` (client), `BuyPanel` (client, tier price preview mirrors `lib/pricing.ts` min-rule), `Breadcrumbs` (+JSON-LD). `/checkout` (client): posts `/cart/validate` for authoritative totals, then `/checkout/process` (COD only). `app/ph/[slug]/route.ts`: SVG placeholder art for products without photos. States: `not-found.tsx`, `loading.tsx`, `error.tsx`.

## 4f. Shopper tools, mascot, motion (batches 3-4)
`components/Shopper.tsx` (context: wishlist, compare <=4, recently viewed <=8, quick view; localStorage keys `wishlist compare recent`), `CardActions` (heart/compare/quick view on cards), `QuickView`, `CompareTray`, `RecentlyViewed` (+`LiteCard`, `RecordView`), `DeliveryEstimate`, `Gallery` (lightbox), pages `/wishlist` `/compare`; API `GET /products/:slug/related`. Motion: `lib/motion.ts` (`motionAllowed`, `fireConfetti`, `mascotSay`), `Motion.tsx` (ScrollProgress, Reveal, Tilt), `Mascot.tsx`, `Confetti.tsx`, `Logo3D.tsx`; visitor override `data-motion-pref` + `localStorage motion-pref`; site setting `data-motion`. CSS for all of it is in `globals.css` (custom classes in `@layer components`, reduced-motion scoped with `html:not([data-motion-pref="on"])`).

## 4g. Accounts and engagement (batch 5)
Auth for customers uses httpOnly cookies set by Next route handlers (`ax_at` 15 min, `ax_rt` 30 days). `middleware.ts` refreshes `ax_at` from `ax_rt` and redirects signed-out users from `/account*`. Browser code never holds the token: signed-in/mutating calls go through `/api/proxy/*` (allow-list in `app/api/proxy/[...path]/route.ts`; add a path there to expose a new API route to the browser). Server components call `apiAuthed()` (`lib/session.ts`). API: `routes/account.ts` (profile, addresses, orders, loyalty, guest track), `routes/engagement.ts` (reviews, helpful, newsletter, stock alerts), moderation in `routes/admin.ts`. Reviews are PENDING until an admin approves; `verified` = reviewer has a non-canceled order with the product. Loyalty is computed from DELIVERED orders (constants in `account.ts`). Rate limiting is an in-memory map (`lib/auth.ts limited()`): replace with Redis when running more than one API process.

## 4h. Section pages, theme options, footer/header builders (batch 6)
Pages are JSON templates, not code. API: `lib/sections.ts` is the ONE definition of every section type (fields, blocks, defaults, sanitizer; add a type here, then add a renderer in `apps/web/src/components/sections/index.tsx`, the admin editor needs no change because it reads `/admin/section-schemas`). Routes in `routes/templates.ts`: public `GET /templates?key=` (published only) and `/templates/preview?key&token` (signed 10-minute token from `/admin/templates/preview-token`); admin CRUD on drafts, `publish`, `rollback` (last 30 versions kept in `template_versions`), `section-presets`. Keys: `home` or `page:<slug>` (custom pages render at `/p/<slug>`; middleware turns missing ones into a real 404). Tables: migration `006_page_templates.sql`. Absent field = default, cleared string stays empty (so editors can blank text). Admin editor: `apps/admin/src/app/pages/edit` (HTML5 drag and drop, add/duplicate/hide/delete, per-section device preview, preview in storefront).
Theme options live in `site_settings.branding` (heading font, button/card/badge style, layout width boxed/wide/full, rotating announcements, header CTA, social links, 7 colour schemes and 5 type pairings as one-click presets in admin settings) and `site_settings.footer` (columns, links, newsletter/perks/payments toggles). `getSite()` in `apps/web/src/lib/api.ts` merges defaults so older cached settings never crash the page. Admin settings page: use functional `setB(prev => ...)` for every update (several quick updates otherwise overwrite each other).

## 4i. Icon set and interaction effects (batch 7)
`components/icons/set.tsx`: extended duotone icons (kitchen tools, care, safety, dietary, eco, difficulty) plus `ICON_TAGS`, the tag-to-icon map: give a product the tag `dishwasher-safe`, `vegan`, `bpa-free`, ... and `components/TagIcons.tsx` shows the icon on its card and product page (tooltip on hover/focus). New tag = one row in `ICON_TAGS`. `components/Effects.tsx` (mounted in `layout.tsx`): button ripple, fly-to-bag (fired by `CartProvider.add` through `flyToCart()` in `lib/motion.ts`, ends with a bag bounce on `[data-bag]`), back-to-top progress ring, cookie notice, newsletter popup (30 s or exit intent, once per 14 days, localStorage `nl-popup`). All are switches in `branding.effects` (admin Settings > Shopper experience) and every animation obeys `motionAllowed()`. `branding.searchHints` rotates the header search placeholder. Gotcha: the API is started without watch, so restart it after changing zod schemas (unknown keys are silently stripped).

## 4j. Coupons, gift options, cart extras (batch 8B)
Pricing stays server-side in `lib/pricing.ts`: order is subtotal, then coupon discount (`lib/coupons.ts`), then delivery (free over the threshold on the discounted amount, or by a free-delivery coupon), then gift wrap. `/cart/validate` takes `couponCode` + `giftWrap` and never throws on a bad code (returns `couponError`); `/checkout/process` throws. Storefront cart state beyond lines is in `CartProvider` (`extras`: coupon, note, gift wrap/message; `saved`: save-for-later), all in localStorage. `components/CartExtras.tsx` holds the shared pieces (pricing hook, `PromoField`, `GiftOptions`, `Upsells`) used by the drawer and checkout.

## 4k. Product page media and rich content (batch 8C)
One product edit path: `routes/productsAdmin.ts`. Rich content lives in `products.metafields` under fixed keys (`videoUrl`, `spinImages`, `sizeGuide`, `specs`, `care`, `material`, `materialNote`); other keys in metafields are preserved on save. Colour swatches come from variant attributes `color` + `colorHex`; `product_variants.image_index` is the photo shown when that variant is picked (Gallery listens for the `pdp-image` window event). `components/PdpExtras.tsx` holds the video player, 360 viewer, model-viewer wrapper (npm `@google/model-viewer`, imported only when the 3D tab opens), size guide + finder, specs/care, live viewers and Q&A. Card hover video uses `metafields.videoUrl` (direct files only) via `components/HoverVideo.tsx`.

## 5. Known gaps / traps
- Free-shipping threshold and flat fee are duplicated in `lib/pricing.ts` and `CartDrawer.tsx`; move to a settings table when admin exists.
- Cart drawer shows client-side prices; fine because checkout re-prices, but cart validation on open is a TODO.
- Refresh tokens are not revocable yet.
- No rate limiting yet (needed on auth + checkout).
- Nothing has been executed end-to-end yet (see `REMAINING_TASKS.md`).
