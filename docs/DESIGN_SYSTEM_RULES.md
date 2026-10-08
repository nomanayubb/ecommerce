# Design system rules: everything must match and align with the logo

User requirement (2026-10-08): every feature from the three backlog lists must look and feel like ONE brand, aligned with each other and with the AVERIXA logo, with colours very much aligned. Before adding any element:

## Palette (derived from the logo, the single source of truth)
| Role | Value | Notes |
|---|---|---|
| Ink | `#1E1E20` | logo black; light-mode text + primary buttons |
| Gold | `#C89C3A` | logo gold; brand accent |
| Gold on dark | `#D4AA46` | gold brightened for contrast on black (dark/OLED accent + buttons) |
| Gold on cream | `#B88C2C` | gold darkened for contrast on cream (light accent) |
| Cream | `#FAF6EE` | logo background; light-mode page |
| Charcoal | `#0F0F11` / OLED `#000` | dark / OLED page |
Only these hues (plus neutral tints/alphas of them) may appear. Warm "kitchen" colors (terracotta, sage, copper) and occasion packs may shift the accent, but must stay in the same warm-metal/neutral family and keep ink/cream/charcoal as the base; status colors (green/orange/red) are for stock/errors only.

## Rules
1. **Tokens only.** Colors, radius, type, spacing come from CSS tokens (`--bg --fg --muted --card --line --brand --on-brand --accent --radius --font`) in `apps/*/src/app/globals.css`, driven by DB branding. No one-off hex values in components (fixed hero/announcement blacks are the only literals).
2. **Logo-aligned visual language.** The logo is angular, thin-stroked line art (gold + ink, cart emblem, geometric wordmark). Icons, mascot, illustrations, particles, 3D and patterns must reuse that language: ~2px square-cap strokes, angular geometry, gold + ink/cream duotone, uppercase letter-spaced type. No rounded cartoon/clip-art styles. A mascot/3D character is designed in the same stroke style and palette, and the 3D logo is the actual logo extruded, not a redraw.
3. **One icon set.** All icons come from a single custom SVG set (`components/icons/`, to be built): 24px grid, 1.75 stroke, `currentColor` + `--accent` second tone, aria-labelled, RTL-safe.
4. **One motion language.** Easing `cubic-bezier(.2,.7,.2,1)`, 200-350ms UI, 600-800ms reveals, always honour `prefers-reduced-motion`; a global animation-intensity setting (off/subtle/full) gates non-essential motion.
5. **Theme-pack aware.** Decorative items read the active pack (`apps/web/src/themes/`) so occasion/kitchen packs restyle everything consistently.
6. **Reuse before create.** Use `.btn .btn-primary .btn-ghost .eyebrow .gold-rule .lift` and shared components (Logo, ProductCard, Breadcrumbs). A new pattern joins the shared set, then is reused everywhere.
7. **Performance & a11y budget.** Heavy effects (3D, particles, cursor, sound) are lazy-loaded, off by default on touch / low-power / reduced-motion, keyboard accessible, WCAG AA contrast in light, dark and OLED.
8. **Verify together.** After each batch, check home, list, product, bag, checkout and admin in all three themes at mobile and desktop widths so nothing drifts.

9. **Swappable brand kit.** The palette above is AVERIXA instance of a brand kit; nothing brand-specific may be hard-coded. See `docs/NEW_PROJECT_GUIDE.md` (how to rebrand, plus the list of hard-coded values still to remove).
