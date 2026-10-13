// Files imported KK Mart products that no KK collection listed by matching their type and tags to our collection names
// (deepest match wins). Hides products with a zero price or no photo as drafts so nothing is sold at Rs. 0.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const cache = JSON.parse(fs.readFileSync(path.join(here, ".kk-cache.json"), "utf8")) as { products: { id: number; handle: string; product_type: string; tags: string[] }[] };
const norm = (s: string) => s.toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9]+/g, "");
const cats: { id: string; name: string; parent_id: string | null }[] = (await pool.query("SELECT id, name, parent_id FROM categories WHERE slug <> 'averixa'")).rows;
const depth = (id: string): number => { let d = 0, c = cats.find((x) => x.id === id); while (c?.parent_id) { d++; c = cats.find((x) => x.id === c!.parent_id); } return d; };
const byName = new Map<string, string[]>();
for (const c of cats) byName.set(norm(c.name), [...(byName.get(norm(c.name)) ?? []), c.id]);
const depthOf = new Map(cats.map((c) => [c.id, depth(c.id)]));
const kk = new Map(cache.products.map((p) => [String(p.id), p]));
const SKIP = new Set(["others", "cosmetics", "household", "grocery", "toys", "sports", "textile", "stationery", "electronics", "footwear", "luggage", "watches", "jewellery", "crockery"]);

const rows = (await pool.query(
  "SELECT p.id, p.metafields->>'kkProductId' AS kid FROM products p WHERE p.metafields->>'source' = 'kkmart' AND NOT EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id)"
)).rows;
let placed = 0;
for (const r of rows) {
  const k = kk.get(r.kid);
  if (!k) continue;
  let best: string[] = [], bestDepth = -1;
  for (const t of [k.product_type, ...k.tags]) {
    const n = norm(t || "");
    if (!n || SKIP.has(n)) continue;
    for (const id of byName.get(n) ?? []) { const d = depthOf.get(id)!; if (d > bestDepth) { best = [id]; bestDepth = d; } else if (d === bestDepth && !best.includes(id)) best.push(id); }
  }
  if (!best.length) continue;
  for (const id of best) await pool.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [r.id, id]);
  placed++;
}
const hidden = await pool.query("UPDATE products SET status = 'DRAFT' WHERE status = 'PUBLISHED' AND (selling_price <= 0 OR jsonb_array_length(images) = 0) AND metafields->>'source' = 'kkmart'");
await delPattern("catalog:*").catch(() => {});
process.on("exit", () => {});
console.log(`uncategorised before: ${rows.length}, placed now: ${placed}; hidden as draft (no price or no photo): ${hidden.rowCount}`);
await pool.end();
process.exit(0);
