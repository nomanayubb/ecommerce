// Home picture for the ELECTRONICS shop: four real flagship products (refrigerator, TV, air conditioner, washing machine) in an even 2 x 2 grid, each centred in its own cell and
// standing on a common line, inside a safe area (the hero crops the sides on some screens, so nothing important is near the edges).
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
// cells of the 2 x 2 grid inside the safe area (x 190..1010, y 90..810); each product sits on the cell's bottom line
const CW = 400, CH = 340, GX = 20, GY = 40, X0 = 190, Y0 = 90;
const cells = [0, 1, 2, 3].map((i) => ({ x: X0 + (i % 2) * (CW + GX), y: Y0 + Math.floor(i / 2) * (CH + GY) }));
const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f8fc"/><stop offset="1" stop-color="#dfe7f4"/></linearGradient><radialGradient id="r" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#r)"/>` +
  `<g stroke="#1f4fa8" stroke-opacity=".10" stroke-width="2" fill="none"><path d="M0 120H150V240H190M1200 300H1050V420H1010M120 900V780H190M1000 900V800H1070V700"/></g><g fill="#1f4fa8" fill-opacity=".14"><circle cx="190" cy="240" r="6"/><circle cx="1010" cy="420" r="6"/><circle cx="190" cy="780" r="6"/><circle cx="1070" cy="700" r="6"/></g></svg>`);
const shadow = (w: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="40"><ellipse cx="${w / 2}" cy="20" rx="${w * 0.4}" ry="9" fill="#0f2a55" fill-opacity=".22"/></svg>`);
const layers: sharp.OverlayOptions[] = [];
for (let i = 0; i < 4; i++) {
  const img = await pick(slugs[i]); if (!img) continue;
  const { data, info } = await sharp(fs.readFileSync(path.join(DIR, path.basename(img)))).trim({ threshold: 14 }).resize({ width: CW - 40, height: CH - 30, fit: "inside" }).png().toBuffer({ resolveWithObject: true });
  const c = cells[i], left = Math.round(c.x + (CW - info.width) / 2), bottom = c.y + CH - 14;
  layers.push({ input: shadow(info.width + 40), left: Math.round(c.x + (CW - info.width - 40) / 2), top: bottom - 16 });
  layers.push({ input: data, left, top: bottom - info.height, blend: "multiply" });
}
await sharp(bg).composite(layers).webp({ quality: 88 }).toFile(path.join(DIR, "ec-hero.webp"));
console.log(`home picture written (${layers.length / 2} products)`);
await pool.end();
process.exit(0);
