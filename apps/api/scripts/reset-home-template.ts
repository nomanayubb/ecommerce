// Removes the stored home template row so the built-in default layout is re-created fresh (also clears its versions).
import { pool } from "../src/lib/db.js";
const r = await pool.query("DELETE FROM page_templates WHERE key = 'home' RETURNING 1");
console.log(`home template reset: ${r.rowCount} row(s)`);
await pool.end();
