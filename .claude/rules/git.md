# Git / GitHub rules

- Commit after each finished task (after the docs in `workflow.md` are updated). One focused commit per task; message = what + why, imperative mood. End with the attribution line the session provides.
- Push to GitHub after each commit **only if** a remote named `origin` exists and `gh`/credentials work. If not, commit locally and tell the user once what's missing; don't retry.
- Never push `.env`, secrets, `node_modules`, build output. Check `git status` before committing; stage files by name, not `git add -A` blindly.
- Never force-push, rewrite history, or delete branches without being asked.
- Creating the GitHub repo (publishing the code) needs the user's explicit go-ahead on name and visibility. Default recommendation: private.
- Branch: work on `main` unless the user asks for feature branches.
