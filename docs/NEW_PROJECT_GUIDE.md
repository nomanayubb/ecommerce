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

## Known hard-coded brand values to remove (blocks easy swapping)
- `app/layout.tsx`: announcement bar uses fixed `#0f0f11` / `#d4aa46`; `viewport.themeColor` fixed `#0f0f11`.
- `app/page.tsx`: hero default gradient `#0b0b0d/#17171a/#2a2318`, hero text/button colors (`#f5f0e6`, `#d4aa46`), `HeroArt` line art drawn like the AVERIXA logo.
- `app/ph/[slug]/route.ts`: gold `#d4aa46` + AVERIXA text + logo-like art.
- `components/Footer.tsx`: perk copy ("Rs. 5,000", Pakistan, cash on delivery) and `Header.tsx` placeholder copy are store-specific; move to settings/content.
- `lib/pricing.ts` + `CartDrawer.tsx`: free-delivery threshold/fee duplicated; move to settings.
- `apps/admin`: sidebar brand text "Admin" and the logo files are AVERIXA's; read from branding.
- Fonts: only 4 system stacks; add a font-pairing preset system (theme list item 92) for real typography swaps.
Rule: new code must read these from tokens/settings so this list shrinks, never grows.
