# Commerce Platform — session entry point

Custom headless e-commerce (Pakistan-first: PKR, COD now, EasyPaisa/JazzCash later). Monorepo, npm workspaces.
Auto-loaded every session. Keep this file short. Detail lives in `docs/`.

## Start of every session (do this, nothing more)
1. Read `docs/REMAINING_TASKS.md` (what to do next + current blockers).
2. Read only the last ~40 lines of `docs/CHANGELOG.md` (what changed recently).
3. Read `docs/ARCHITECTURE.md` ONLY if the task touches code you don't already understand — then read only the section you need.
Do not browse the repo, `node_modules`, lockfiles, or unrelated files. Rules are in `.claude/rules/` (auto-loaded).

## Map
- `apps/api` — Fastify + TypeScript API (`src/server.ts`, `src/routes/*`, `src/lib/*`, `migrations/*.sql`)
- `apps/web` — Next.js 15 storefront :3000 (Tailwind, Framer Motion). Theme packs in `src/themes/`
- `apps/admin` — Next.js admin panel :3001 (login, dashboard, products grid + create, orders, brand & theme settings)
- `docker-compose.yml` — Postgres 16, Redis 7, Typesense 27 (dev). Docker is broken on this PC, see blockers.
- `docs/` — ARCHITECTURE, REMAINING_TASKS, CHANGELOG, SPEC_NOTES

## Current status (update on every milestone)
RUNNING and tested locally (2026-10-08): API + storefront + admin + embedded Postgres; full buy flow (PDP -> bag -> checkout -> COD order) verified in the browser. Redis not installed (cache fails open).
Start dev (3 terminals, repo root): `npm run dev:db -w api` -> `npm run migrate && npm run seed -w api` (first time) -> `npm run dev:api` -> `npm run dev -w web` -> `npm run dev -w admin`.
Docker is broken on this PC (WSL VM) and the winget Postgres installer returns 403, so DB = `embedded-postgres` (npm), data in `apps/api/.pgdata`, creds shop/shop (dev only).

## Design intent (user requirement)
Everything visual must be swappable from files/settings so another project can reuse the code: brand name, logo, colors, radius, font, announcement come from DB `site_settings.branding` (admin "Brand & theme"); occasion looks (Halloween, Eid, Christmas, Black Friday, Independence) are **theme packs** = one data file each in `apps/web/src/themes/packs/`. User wants ~100 "beauty elements" grouped by occasion category; build them as parametric pieces driven by pack data. 

## Brand: AVERIXA (logo received 2026-10-08)
Flat line-art logo: ink `#1E1E20`, gold `#C89C3A`, cream `#FAF6EE`; tagline "Your world. Our store." Default look = BLACK theme (user prefers it) with gold accents, 2px corners, uppercase letter-spaced type; light (cream) and OLED are toggles.
- Logo pipeline: `brand-source/logo.jpg` -> `python scripts/build-brand.py` -> transparent PNG/WebP (light + `-dark` twins), mark, horizontal lockup, icons, og-image into `apps/{web,admin}/public/brand/`. Replace the source + re-run to rebrand another project.
- Tokens (`--bg --fg --muted --card --line --brand --on-brand --accent --radius --font`) in `apps/*/src/app/globals.css`; logo swap by theme via `.logo-on-light/.logo-on-dark`; `.btn .btn-primary .btn-ghost .eyebrow .gold-rule .lift` utility classes.
- Initial branding row set by migration `003_averixa_branding.sql`; later edits via admin "Brand & theme" (adds accent color + dark logo).
- Unused leftovers from an earlier session in `apps/*/public/logo-*.webp`, `brand/` (3D v1 logo kit) — safe to delete once confirmed.

## Hard facts
- Payment methods allowed = env `ENABLED_PAYMENT_METHODS` (default `COD`). EasyPaisa/JazzCash adapters not built (no API access yet).
- Prices are always computed server-side (`apps/api/src/lib/pricing.ts`). Never trust client prices.
- Secrets live only in `apps/api/.env` (git-ignored). Never print or commit them.
- GitHub: `origin` = https://github.com/nomanayubb/ecommerce, branch `main`. Commit + push after each task.
- Windows host; shell commands via Bash (POSIX) or PowerShell.
