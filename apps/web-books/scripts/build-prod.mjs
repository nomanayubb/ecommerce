// Production build into .next-prod (never touches the dev server's .next). Prints First Load JS per route.
import { spawnSync } from "node:child_process";
const r = spawnSync("npx", ["next", "build"], { stdio: "inherit", shell: true, env: { ...process.env, NEXT_DIST_DIR: ".next-prod", NEXT_TELEMETRY_DISABLED: "1" } });
process.exit(r.status ?? 1);
