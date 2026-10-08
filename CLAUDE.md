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
- `apps/web` — Next.js 15 App Router storefront (Tailwind, Framer Motion)
- `docker-compose.yml` — Postgres 16, Redis 7, Typesense 27 (dev). Docker is broken on this PC, see blockers.
- `docs/` — ARCHITECTURE, REMAINING_TASKS, CHANGELOG, SPEC_NOTES

## Current status (update on every milestone)
Built and type-checked, NOT yet run end to end: API (auth, catalog, cart/checkout, basic admin), storefront (home, list, product page, cart drawer, COD checkout).
Blocker: Docker Desktop engine won't start (WSL VM). Plan: install Postgres 16 + Memurai (Redis) natively, then migrate/seed/run/test.

## Hard facts
- Payment methods allowed = env `ENABLED_PAYMENT_METHODS` (default `COD`). EasyPaisa/JazzCash adapters not built (no API access yet).
- Prices are always computed server-side (`apps/api/src/lib/pricing.ts`). Never trust client prices.
- Secrets live only in `apps/api/.env` (git-ignored). Never print or commit them.
- GitHub: `origin` = https://github.com/nomanayubb/ecommerce, branch `main`. Commit + push after each task.
- Windows host; shell commands via Bash (POSIX) or PowerShell.
