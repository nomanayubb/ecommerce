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
RUNNING and tested locally (2026-10-09): API + storefront + admin + embedded Postgres; full buy flow (PDP -> bag -> checkout -> COD order) verified in the browser. Redis not installed (cache fails open).
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

## Feature backlogs + design rules
Reusing the theme for another project: `docs/NEW_PROJECT_GUIDE.md`. Three user-supplied lists live in `docs/FEATURES_*.md` (status per item). Every new element must obey `docs/DESIGN_SYSTEM_RULES.md` (everything aligned with each other, the logo and its palette). Read only the list you are working on.

## Customer accounts (batch 5)
Customers sign up/in at `/register` `/login`; session = httpOnly cookies via Next route handlers + proxy (see `docs/ARCHITECTURE.md` 4g). Reviews need admin approval (admin > Reviews). No emails are sent yet (no provider). QA cleanup: `npx tsx scripts/cleanup-qa.ts` in `apps/api` (removes `qa.*@example.test` data).

## Section pages (batch 6)
Home and custom pages (`/p/<slug>`) are JSON section templates edited in admin > Pages (draft, publish, versions, presets, preview). Section types are defined only in `apps/api/src/lib/sections.ts`; renderers in `apps/web/src/components/sections/index.tsx`. See `docs/ARCHITECTURE.md` 4h. Clean QA data with `apps/api/scripts/cleanup-qa.ts`; `reset-home-template.ts` restores the default home.

## Performance budget (owner rule 2026-10-12: the site must load in about one second)
Every new feature must not make the shop heavier: prefer server components and CSS; client code only when unavoidable, tiny, and loaded on demand (`next/dynamic`, `components/LazyHosts.tsx` idle hosts). Never add a library to the first load. Before and after a batch, run `npm run build:prod -w web` (separate `.next-prod` folder) and compare First Load JS: shared <= 110 kB, any page <= 145 kB (gzip, as printed by Next). Baseline 2026-10-12: shared 104 kB, home 136 kB, product page 128 kB. If a feature breaks the budget, lazy-load it or drop it.

## Judging speed (important)
`next dev` (what `npm run dev -w web` runs) compiles pages on demand and is many times slower than the real site; never judge speed from it. For the real thing: `npm run build:prod -w web`, then `NEXT_DIST_DIR=.next-prod npx next start -p 3000` in apps/web (after stopping the dev server). Measured 2026-10-12 on the production build: page ready 87 ms, fully loaded 302 ms. Heavy visual effects are a second cause of lag: avoid `-webkit-box-reflect` on animated text, `mix-blend-mode` on new layers, extra full-screen fixed layers, and big `backdrop-filter` blurs. The old effects (film grain, kinetic hero text, tilt, reveals) stay as they were.

## Hard facts
- Payment methods allowed = env `ENABLED_PAYMENT_METHODS` (default `COD`). EasyPaisa/JazzCash adapters not built (no API access yet).
- Prices are always computed server-side (`apps/api/src/lib/pricing.ts`). Never trust client prices.
- Secrets live only in `apps/api/.env` (git-ignored). Never print or commit them.
- GitHub: `origin` = https://github.com/nomanayubb/ecommerce, branch `main`. Commit + push after each task.
- Windows host; shell commands via Bash (POSIX) or PowerShell.

## Live tracker = the user's screen vision (READ-ONLY project: never edit its files)
Located at `C:\Users\noman\Desktop\live-tracker` (the `D:\live-tracker` copy is old). Tracker = EYES (frames: `.live_frame.jpg` full-screen sharp frame + `.live_screen_state.txt`), `clicker.py` = HANDS (focus a window, press keys, click). The embedded browser draws no animation frames and cannot show real motion, so use the tracker to verify visuals/animation on the user's real Chrome.
- Only start it when the user says "tracker on". Documented start (README is the source of truth, `SETUP.txt` is outdated): `cd live-tracker && ./venv/Scripts/python.exe dual_tracker.py "Firefox"` (run in background; needs ~30s to load OCR). Do NOT edit its code or switch files; `.tracker_fullscreen` already forces real full-screen capture, a stale `.tracker_window_config.txt` ("Claude") is harmless then.
- Open the site in the user's browser with `Start-Process "http://localhost:3000/"` (no mouse needed). Bring Chrome forward / press keys only through `clicker.Clicker("Google Chrome", shots=False)` inside ONE script run (focus reverts when a script exits), run with `venv\Scripts\python.exe -B` and write copies/frames only to the scratchpad. Examples: `scripts/screen-check/verify_motion.py` (measures frame-to-frame change; clicks the header Animations icon after a safety check), `view_sections.py`.
- Prove motion by comparing frames over time (mean pixel change per second), not by one screenshot. Check the foreground window is Chrome first (focus returns to the Claude app after tool calls).
- Privacy: it records the whole screen. Read only the latest frame/state; never open its `*_history.jsonl`/click logs. Stop it when done (kill only the `dual_tracker.py` PIDs) and say so.
- Findings so far (2026-10-09): on the user's PC Windows animation effects are OFF, so by default the hero was static (measured 0.0 change); after pressing the Animations icon the glow/line art changed 2.4-5.0 per second.

## Fast design iteration (card hover and button design)
- The product card hover and button design lives in **apps/web/public/card-fx.css**, a plain stylesheet the layout loads at runtime (`<link rel="stylesheet" href="/card-fx.css">` in the head, after Next's own CSS, so it overrides the earlier card rules in globals.css exactly as before).
- **To change the design: edit that file and reload the page. No build, no restart** (measured: the live server serves the edit in about 0.1 s; the file is sent with `Cache-Control: max-age=0` so browsers always recheck it). Port 3000 keeps running the production build.
- It is plain CSS, not processed by Tailwind or the minifier. Keep it that way: no `@apply`, no `theme()`. (Bonus: the minifier bug that broke `@property` percentages, `initial-value: 0%` turned into `0`, cannot touch this file.)
- A production build (`NEXT_DIST_DIR=.next-new npx next build` into the folder the running server is NOT using, then stop and start `next start -p 3000 -H 0.0.0.0` with that `NEXT_DIST_DIR`; about 2 minutes plus a 10 s swap) is only needed for changes to TSX/JS or the main stylesheet, for new files in `public/` (the production server indexes `public/` at startup, so a brand new file needs a restart, but edits to an existing file do not), and for a final check before publishing. Always keep port 3000 up while building; warm `/`, `/collections`, `/collections/<slug>`, `/products` twice after the swap so one reload shows the change (home and collections are ISR with 30 s stale-while-revalidate).
- Rule: change nothing about a card's resting look; resting values must match `b8740c9`'s look; hover work stays hover-only.
