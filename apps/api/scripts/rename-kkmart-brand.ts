// Shows KK Mart's own-label products as AVERIXA: moves them to the AVERIXA brand (so the Brand filter and the
// "AVERIXA products only" switch include them) and swaps "KK Mart" for AVERIXA in product descriptions.
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";

const avx = (await pool.query("SELECT id FROM brands WHERE slug = 'averixa'")).rows[0]?.id as string | undefined;
if (!avx) throw new Error("AVERIXA brand not found: run seed-averixa.ts first");
const old = (await pool.query("SELECT id FROM brands WHERE slug ~ '^kk-?mart$' OR name ~* '^kk ?mart$'")).rows.map((r) => r.id as string);
const moved = await pool.query("UPDATE products SET brand_id = $1 WHERE brand_id = ANY($2::uuid[])", [avx, old]);
await pool.query("DELETE FROM brands WHERE id = ANY($1::uuid[])", [old]);
const texts = await pool.query("UPDATE products SET description = regexp_replace(description, 'kk ?mart', 'AVERIXA', 'gi') WHERE description ~* 'kk ?mart'");
await delPattern("catalog:*").catch(() => {});
console.log(`products moved to the AVERIXA brand: ${moved.rowCount}; descriptions reworded: ${texts.rowCount}; old brands removed: ${old.length}`);
await pool.end();
process.exit(0);
