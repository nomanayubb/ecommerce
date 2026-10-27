// Gives every collection of the ELECTRONICS shop a real product picture (instead of the generated artwork): a flagship product on a clean light tile, and a three-product
// collage for each top-level menu. Pictures go to apps/web/public/cs/ec-<slug>.webp and into categories.image_url of the current database.
//   DATABASE_URL=postgres://.../shop_electronics npx tsx scripts/make-category-pictures.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";

sharp.cache(false);
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/electronics/.test(db)) throw new Error(`refusing to run on database "${db}"`);
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/public/cs");
const W = 800, H = 600;

const photo = (url: string) => fs.readFileSync(path.join(DIR, path.basename(url)));
const bg = async () => sharp(Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f8fc"/><stop offset="1" stop-color="#e6ecf6"/></linearGradient>` +
  `<radialGradient id="r" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>` +
  `<rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#r)"/></svg>`)).png().toBuffer();
const shadow = (w: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="60"><ellipse cx="${w / 2}" cy="30" rx="${w * 0.36}" ry="12" fill="#0f2a55" fill-opacity=".22"/></svg>`);
const item = async (file: Buffer, size: number) => sharp(file).resize({ width: size, height: size, fit: "contain", background: "#ffffff" }).png().toBuffer();

type Cat = { id: string; slug: string; name: string; parent_id: string | null };
const cats = (await pool.query("SELECT id, slug, name, parent_id FROM categories")).rows as Cat[];
const flagship = async (catId: string, n: number) => (await pool.query(
  `SELECT p.images->>0 img FROM products p JOIN product_categories pc ON pc.product_id=p.id
   WHERE pc.category_id=$1 AND p.status='PUBLISHED' AND p.images->>0 LIKE '/cs/e-%' AND p.brand_id IS NOT NULL
   ORDER BY p.selling_price DESC OFFSET 2 LIMIT $2`, [catId, n])).rows.map((r) => r.img as string);

async function tile(items: string[]): Promise<Buffer> {
  const layers: sharp.OverlayOptions[] = [];
  if (items.length === 1) {
    layers.push({ input: shadow(420), left: 190, top: 478 }, { input: await item(photo(items[0]), 470), left: 165, top: 70, blend: "multiply" });
  } else {
    const [a, b, c] = items;
    layers.push(
      { input: shadow(260), left: 30, top: 440 }, { input: await item(photo(b), 300), left: 30, top: 170, blend: "multiply" },
      { input: shadow(260), left: 510, top: 440 }, { input: await item(photo(c ?? b), 300), left: 490, top: 170, blend: "multiply" },
      { input: shadow(380), left: 210, top: 478 }, { input: await item(photo(a), 440), left: 180, top: 80, blend: "multiply" });
  }
  return sharp(await bg()).composite(layers).webp({ quality: 86 }).toBuffer();
}

let made = 0;
const leaves = cats.filter((c) => c.parent_id);
const bySlug = new Map<string, string>();
for (const c of leaves) {
  const imgs = await flagship(c.id, 1);
  if (!imgs.length) continue;
  const file = `ec-${c.slug}.webp`;
  fs.writeFileSync(path.join(DIR, file), await tile([imgs[0]]));
  await pool.query("UPDATE categories SET image_url=$2 WHERE id=$1", [c.id, `/cs/${file}`]);
  bySlug.set(c.id, imgs[0]); made++;
}
for (const g of cats.filter((c) => !c.parent_id)) {
  const kids = cats.filter((k) => k.parent_id === g.id);
  const counts = await Promise.all(kids.map(async (k) => ({ k, n: Number((await pool.query("SELECT count(*) n FROM product_categories WHERE category_id=$1", [k.id])).rows[0].n) })));
  const picks = counts.sort((a, b) => b.n - a.n).slice(0, 3).map((x) => bySlug.get(x.k.id)).filter(Boolean) as string[];
  if (!picks.length) continue;
  const file = `ec-${g.slug}.webp`;
  fs.writeFileSync(path.join(DIR, file), await tile(picks));
  await pool.query("UPDATE categories SET image_url=$2 WHERE id=$1", [g.id, `/cs/${file}`]);
  made++;
}
await delPattern("catalog:*").catch(() => {});
await delPattern("categories:*").catch(() => {});
console.log(`collection pictures made: ${made} (database ${db})`);
await pool.end();
process.exit(0);
