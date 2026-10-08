// Dev-only embedded Postgres (no Docker/installer). Data lives in apps/api/.pgdata (git-ignored).
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";

const databaseDir = new URL("../.pgdata", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const pg = new EmbeddedPostgres({ databaseDir, user: "shop", password: "shop", port: 5432, persistent: true });

if (!fs.existsSync(`${databaseDir}/PG_VERSION`)) await pg.initialise();
await pg.start();
try { await pg.createDatabase("shop"); } catch { /* already exists */ }
console.log("dev postgres ready on postgres://shop:shop@localhost:5432/shop");

const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
