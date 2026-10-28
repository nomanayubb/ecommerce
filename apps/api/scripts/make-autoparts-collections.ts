// Collection pictures for the AUTO PARTS shop (DATABASE_URL = shop_autoparts; refuses any other database): every menu and sub-menu gets a 4:3 tile, a flagship part of that menu on a light plate
// with a chamfered corner and an orange edge, on carbon-dark. Written to apps/web-autoparts/public/cs/apc-<slug>.webp and saved in categories.image_url.   npx tsx scripts/make-autoparts-collections.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";

sharp.cache(false);
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/autoparts/.test(db)) throw new Error(`refusing to run on database "${db}"`);
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web-autoparts/public/cs");
const W = 800, H = 600, PX = 70, PY = 60, PW = W - PX * 2, PH = H - PY * 2, CUT = 54;

const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b1e25"/><stop offset="1" stop-color="#0d0e11"/></linearGradient>
<radialGradient id="o" cx=".85" cy=".9" r=".6"><stop offset="0" stop-color="#ff5a1f" stop-opacity=".35"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></radialGradient>
<linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3e6ec"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#o)"/>
<path d="M0 ${H * 0.82} L${W} ${H * 0.58}" stroke="#ff5a1f" stroke-opacity=".12" stroke-width="3"/><path d="M0 ${H * 0.9} L${W} ${H * 0.66}" stroke="#ff5a1f" stroke-opacity=".07" stroke-width="2"/>
<polygon points="${PX},${PY} ${PX + PW - CUT},${PY} ${PX + PW},${PY + CUT} ${PX + PW},${PY + PH} ${PX},${PY + PH}" fill="url(#p)" stroke="#ff5a1f" stroke-width="3"/>
<polygon points="${PX + PW - CUT},${PY} ${PX + PW},${PY + CUT} ${PX + PW - CUT},${PY + CUT}" fill="#ff5a1f"/></svg>`);

const cats = (await pool.query("SELECT id, name, slug, parent_id FROM categories WHERE is_active ORDER BY parent_id NULLS FIRST, sort_order")).rows as { id: string; name: string; slug: string; parent_id: string | null }[];
let n = 0, none = 0;
for (const c of cats) {
  // a menu uses its own parts and those of its sub-menus; the second most expensive keeps it from being an odd outlier, and only parts whose photo is on disk count
  const rows = (await pool.query(
    `SELECT p.images->>0 img FROM products p JOIN product_categories pc ON pc.product_id=p.id JOIN categories k ON k.id=pc.category_id
      WHERE p.status='PUBLISHED' AND p.images->>0 LIKE '/cs/ap-%' AND (k.id=$1 OR k.parent_id=$1) ORDER BY p.selling_price DESC LIMIT 6`, [c.id])).rows as { img: string }[];
  const src = rows.map((r) => path.join(DIR, path.basename(r.img))).filter((f) => fs.existsSync(f))[1] ?? rows.map((r) => path.join(DIR, path.basename(r.img))).find((f) => fs.existsSync(f));
  if (!src) { none++; continue; }
  const photo = await sharp(fs.readFileSync(src)).trim({ threshold: 14 }).resize({ width: Math.round(PW * 0.8), height: Math.round(PH * 0.8), fit: "inside" }).png().toBuffer({ resolveWithObject: true });
  const out = await sharp(bg).composite([{ input: photo.data, left: PX + Math.round((PW - photo.info.width) / 2), top: PY + Math.round((PH - photo.info.height) / 2), blend: "multiply" }]).webp({ quality: 88 }).toBuffer();
  const f = `apc-${c.slug}.webp`; fs.writeFileSync(path.join(DIR, f), out);
  await pool.query("UPDATE categories SET image_url=$2 WHERE id=$1", [c.id, `/cs/${f}`]); n++;
}
await delPattern("categories:*").catch(() => {}); await delPattern("catalog:*").catch(() => {});
console.log(`collection pictures: ${n} written, ${none} menus without a part photo`);
await pool.end();
process.exit(0);
