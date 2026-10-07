import fs from "node:fs";
import path from "node:path";
import { pool } from "./lib/db.js";

const dir = path.resolve("migrations");
await pool.query(
  "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())"
);
const done = new Set((await pool.query("SELECT name FROM _migrations")).rows.map((r) => r.name));
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(f)) continue;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(fs.readFileSync(path.join(dir, f), "utf8"));
    await c.query("INSERT INTO _migrations(name) VALUES($1)", [f]);
    await c.query("COMMIT");
    console.log("applied", f);
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
await pool.end();
