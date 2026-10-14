// Points products at the transparent cut-outs made by cutout.py: /kk/<file> becomes /kk/c/<file> when that cut-out exists.
// Run again after more photos are cut. The original photos stay in public/kk, so undoing is: npx tsx scripts/use-cutouts.ts --undo
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const CUT = path.resolve(here, "../../web/public/kk/c");
const undo = process.argv.includes("--undo");
const have = new Set(fs.existsSync(CUT) ? fs.readdirSync(CUT) : []);

const rows = (await pool.query("SELECT id, images FROM products WHERE images::text LIKE '%/kk/%'")).rows as { id: string; images: string[] }[];
const ids: string[] = [], imgs: string[] = [];
let photos = 0;
for (const r of rows) {
  let changed = false;
  const next = r.images.map((u) => {
    if (undo) { if (u.startsWith("/kk/c/")) { changed = true; photos++; return u.replace("/kk/c/", "/kk/"); } return u; }
    const m = u.match(/^\/kk\/([^/]+\.webp)$/);
    if (m && have.has(m[1])) { changed = true; photos++; return `/kk/c/${m[1]}`; }
    return u;
  });
  if (changed) { ids.push(r.id); imgs.push(JSON.stringify(next)); }
}
for (let i = 0; i < ids.length; i += 2000) {
  await pool.query(
    "UPDATE products p SET images = v.images::jsonb, updated_at = now() FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS images) v WHERE p.id = v.id",
    [ids.slice(i, i + 2000), imgs.slice(i, i + 2000)]
  );
}
await delPattern("catalog:*").catch(() => {});
console.log(`${undo ? "restored" : "switched"} ${photos} photos on ${ids.length} products (${have.size} cut-outs available)`);
await pool.end();
process.exit(0);
