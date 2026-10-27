// Home picture for the ELECTRONICS shop: a tidy collage of four real flagship products (air conditioner, refrigerator, TV, washing machine) on a light tile.
//   DATABASE_URL=postgres://.../shop_electronics npx tsx scripts/make-hero-picture.ts      -> apps/web-electronics/public/cs/ec-hero.webp
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";

sharp.cache(false);
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/electronics/.test(db)) throw new Error(`refusing to run on database "${db}"`);
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web-electronics/public/cs");
const W = 1200, H = 900;
const pick = async (slug: string) => (await pool.query(
  `SELECT p.images->>0 img FROM products p JOIN product_categories pc ON pc.product_id=p.id JOIN categories c ON c.id=pc.category_id
   WHERE c.slug=$1 AND p.status='PUBLISHED' AND p.images->>0 LIKE '/cs/e-%' AND p.brand_id IS NOT NULL ORDER BY p.selling_price DESC OFFSET 2 LIMIT 1`, [slug])).rows[0]?.img as string;
const slugs = ["refrigerators", "led-tv", "air-conditioners-split", "washing-machines"];
const spots = [{ x: 40, y: 70, s: 520 }, { x: 560, y: 20, s: 560 }, { x: 70, y: 470, s: 440 }, { x: 560, y: 450, s: 480 }];
const circuit = `<g stroke="#1f4fa8" stroke-opacity=".10" stroke-width="2" fill="none"><path d="M0 120H180V240H360M1200 300H980V420H820M120 900V760H300M900 900V780H1060V640"/></g><g fill="#1f4fa8" fill-opacity=".14"><circle cx="360" cy="240" r="6"/><circle cx="820" cy="420" r="6"/><circle cx="300" cy="760" r="6"/><circle cx="1060" cy="640" r="6"/></g>`;
const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f8fc"/><stop offset="1" stop-color="#dfe7f4"/></linearGradient><radialGradient id="r" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#r)"/>${circuit}</svg>`);
const layers: sharp.OverlayOptions[] = [];
for (let i = 0; i < 4; i++) {
  const img = await pick(slugs[i]); if (!img) continue;
  const f = fs.readFileSync(path.join(DIR, path.basename(img))), sp = spots[i];
  layers.push({ input: await sharp(f).resize({ width: sp.s, height: sp.s, fit: "contain", background: "#ffffff" }).png().toBuffer(), left: sp.x, top: sp.y, blend: "multiply" });
}
await sharp(bg).composite(layers).webp({ quality: 88 }).toFile(path.join(DIR, "ec-hero.webp"));
console.log(`home picture written (${layers.length} products)`);
await pool.end();
process.exit(0);
