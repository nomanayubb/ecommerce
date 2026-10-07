# Workflow rules — keep the docs true

After EVERY completed task (code, config, or decision), before the final reply:
1. Append an entry to `docs/CHANGELOG.md` (newest at the bottom): date, what changed, files touched, why, and anything not yet verified.
2. Update `docs/REMAINING_TASKS.md`: tick finished items, add newly discovered ones, record blockers, keep the "Next up" list ordered.
3. If structure, a route, a table, an env var, or a data flow changed, update the matching section of `docs/ARCHITECTURE.md` (edit the section, don't append duplicates).
4. If the "Current status" or a hard fact in `CLAUDE.md` changed, update it there.
5. Commit (see `git.md`).

Rules for the docs themselves:
- Docs describe reality. Never write "works" for something that wasn't run; write "type-checks, not run".
- No secrets, passwords or tokens in any doc, changelog or commit.
- Keep CLAUDE.md under ~60 lines. Move detail into `docs/`.
- New rule files go in `.claude/rules/` (short, imperative, one topic each).

Code conventions:
- API: TypeScript strict, ESM (`.js` import suffixes), zod validation on every route input, parameterized SQL only, money as NUMERIC and rounded to 2dp, all pricing/stock via `lib/pricing.ts`, stock changes inside a transaction with `FOR UPDATE`.
- New DB changes = a new numbered file in `apps/api/migrations/` (never edit an applied one).
- Web: server components fetch via `src/lib/api.ts`; client components only where interactivity is required.
- Staff-only routes live under `/api/v1/admin` (role-checked by the hook in `routes/admin.ts`).
