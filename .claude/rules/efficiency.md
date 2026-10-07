# Efficiency rules (token + time) — without losing depth

Goal: maximum useful work per token, with no loss of reasoning quality.

1. **Think deeply, read narrowly.** Spend reasoning on design, edge cases, security, concurrency and correctness. Spend nothing on exploring files that have no bearing on the task. Fast ≠ shallow.
2. **Read only what the task needs.** Use Grep/Glob to locate, then Read only the needed line range. Never read `node_modules`, `package-lock.json`, `.next`, `dist`, build output, or whole directories "to get familiar". `docs/ARCHITECTURE.md` already says where things are.
3. **Don't re-read.** A file you just wrote/edited is known. Don't re-read it to verify; the edit tools error on failure.
4. **Batch.** Independent tool calls go in one message. Write several files in one turn. Prefer one verifying command (`tsc --noEmit`, a single curl script) over many small ones.
5. **Edit, don't rewrite.** Use Edit for small changes; Write only for new files or full rewrites.
6. **Verify with the cheapest real check.** `npx tsc --noEmit` per app after code changes; run the real endpoint/page for anything user-facing before claiming it works. Say plainly what was and wasn't run.
7. **Short replies.** Report outcome, deviations from the plan, and the next step. No restating the spec, no option surveys when a recommendation will do.
8. **Decide, don't ask,** when a sensible default exists. Ask only for decisions that are the user's (credentials, money, public publishing, destructive actions).
9. **Don't loop on a broken environment.** If something external fails twice (Docker, network), stop, diagnose from logs once, and propose the alternative.
10. **Delegate sparingly.** Subagents start cold; use only when the user asks or the search is truly broad.
