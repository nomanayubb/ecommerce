# Rebranding / reusing this theme for a new project

Goal (user requirement 2026-10-08): the theme must be very customizable so the next project is a settings-and-assets change, not a rewrite. The AVERIXA palette in `DESIGN_SYSTEM_RULES.md` is ONE instance of a brand kit, not baked into code.

## What a brand kit is (all of it swappable)
1. **Logo source**: `brand-source/logo.jpg` -> `python scripts/build-brand.py` -> `apps/*/public/brand/*` (light + dark variants, mark, lockup, icons, og image).
2. **Branding row** (DB `site_settings.branding`, edited in admin "Brand & theme"): name, tagline, logo URLs (light/dark), brand + dark brand + accent colors, radius, font, default theme, announcement, active theme pack.
3. **Theme packs** (`apps/web/src/themes/packs/*.ts`): occasion/vertical looks (tokens + decor). Add `kitchen.ts` for a kitchen store.
4. **Initial values**: a numbered migration (like `003_averixa_branding.sql`) or the admin form.

## Steps for a new project
1. Copy the repo; new DB; run migrations.
2. Replace `brand-source/logo.jpg`, run `python scripts/build-brand.py`.
3. Set colors/radius/font/name in admin (or a new `00X_<brand>_branding.sql`); pick/add a theme pack.
4. Replace placeholder art (`app/ph/[slug]/route.ts` gold line-art) with the brand motif or real photos.
5. Update `CLAUDE.md` brand section + `DESIGN_SYSTEM_RULES.md` palette table.

## What is now settings-driven (batch 2, 2026-10-08)
- **Palette**: `inkColor`, `creamColor`, `darkColor` + `brandColor`, `brandColorDark`, `accentColor` generate EVERY colour token (`lib/branding.ts`: bg/fg/muted/card/line for light, dark, OLED, plus `--dark`, `--on-dark`, `--accent-bright`). No hex literals remain in components.
- **Copy**: `heroText`, `promiseText`, `footerText`, `announcement`, `tagline`, `name` (admin > Brand & theme).
- **Commerce rules**: `store` settings row (`freeShippingThreshold`, `shippingFee`) used by the API pricing, cart drawer, buy panel, footer, product page (admin > Delivery rules).
- **Placeholder art** (`/ph/<slug>`), **admin logo/name**, **theme-color meta**, **motion level**, **radius**, **font**, **default theme**, **theme pack**: all from settings.
- Verified by an automated rebrand test: switching to a different brand (name, palette, radius, font, copy, default theme) through the API changed the rendered storefront with zero code edits (9/9 checks), then restored.

## Still brand/store-specific (remaining work)
- Placeholder + hero line art is drawn in the AVERIXA logo's cart/angle style (`app/ph/[slug]/route.ts`, `HeroArt` in `app/page.tsx`): make the motif selectable/uploadable.
- Footer perk lines, header/checkout wording ("Cash on delivery", "We reply within a day") and currency formatting `pkr()` (PKR/en-PK) are fixed strings: move to settings with multi-currency (theme list item 11, visual item 53).
- Only 4 system font stacks: add font-pairing presets (theme list item 92).
- Occasion packs hard-code their own colours (by design, they override tokens) but are not yet editable in admin.
- `brand-source/logo.jpg` + `scripts/build-brand.py` produce the logo files; admin has URL fields only (no upload yet).
Rule: new code must read from tokens/settings so this list shrinks, never grows.
