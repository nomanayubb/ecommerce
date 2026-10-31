// Adds the menu "2026 Winter Collection" (sub menus Light Khaddar, Light Karandi) to the ATTIRE shop (DATABASE_URL = shop_attire; refuses any other database) with the 24 Bonanza Satrangi "Lia" unstitched
// suits listed in "Bonanza Winter.pdf" (one product card per page 2-25; page 1 is the cover), plus a banner and a product row on the home page. Safe to run again (existing products are skipped).
//   python scripts/extract-pdf-images.py "C:/Users/noman/Desktop/Bonanza Winter.pdf" data/attire/bonanza-winter
//   DATABASE_URL=postgres://.../shop_attire npx tsx scripts/import-bonanza-winter.ts
// Prices are the printed retail prices (Rs. 4,890 khaddar, Rs. 5,290 karandi) as they are: no wholesale markup rule is applied. Stock is not in the PDF, so each suit gets STOCK pieces (edit in admin).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";
import { sanitizeSections } from "../src/lib/sections.js";

sharp.cache(false);
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/attire/.test(db)) throw new Error(`refusing to run on database "${db}"`);
const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, "../data/attire/bonanza-winter"), PHOTOS = path.resolve(here, "../../web-attire/public/cs");
fs.mkdirSync(PHOTOS, { recursive: true });
const STOCK = 20, GROUP = "2026 Winter Collection", GSLUG = "2026-winter-collection";

// [page, name, code, price, fabric]  (read from the cards of the PDF)
const K = "Light Khaddar", R = "Light Karandi";
const LIST: [number, string, string, number, string][] = [
  [2, "Tropical Bloom", "WU3PPBW25LI11D18", 4890, K], [3, "Ice Slit", "WU3PPBW25LI11D13", 4890, K], [4, "Janan", "WU3PPBW25LI11D11", 4890, K], [5, "Terilis", "WU3PPBW25LI11D3", 4890, K],
  [6, "Vela", "WU3PPBW25LI11D1", 4890, K], [7, "Limelight", "WU3PPBW25LI11D7", 4890, K], [8, "Maya", "WU3PPBW25LI11D8", 4890, K], [9, "Serena", "WU3PPBW25LI11D12", 4890, K],
  [10, "Solid", "WU3PPBW25LI11D9", 4890, K], [11, "Gulaal", "WU3PPBW25LI11D14", 4890, K], [12, "Greenry", "WU3PPBW25LI11D4", 4890, K], [13, "Verdant", "WU3PPBW25LI11D2", 4890, K],
  [14, "Resham", "WU3PPBW25LI11D10", 4890, K], [15, "Floral", "WU3PPBW25LI11D15", 4890, K], [16, "Hermony", "WU3PPBW25LI11D5", 4890, K],
  [17, "Gold", "WU3PPBW25S011D9", 5290, R], [18, "Peachy", "WU3PPBW25S011D11", 5290, R], [19, "Texture", "WU3PPBW25S011D8", 5290, R], [20, "Berry", "WU3PPBW25S011D10", 5290, R],
  [21, "Zareen", "WU3PPBW25S011D5", 5290, R], [22, "Miraaz", "WU3PPBW25S011D7", 5290, R], [23, "Aura", "WU3PPBW25S011D12", 5290, R], [24, "Twilight", "WU3PPBW25S011D6", 5290, R], [25, "Dhani", "WU3PPBW25S011D4", 5290, R],
];
const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const pg = (n: number) => path.join(SRC, `p${String(n).padStart(2, "0")}.png`);
if (!LIST.every(([n]) => fs.existsSync(pg(n)))) throw new Error(`page pictures missing in ${SRC}: run scripts/extract-pdf-images.py first`);

// ---- product pictures: the model photo is the left part of the card (x 3-483; the 1-2 px dark edge of the page is trimmed); the full card (fabric lengths, care) is the second picture; white sides blend with the card background
const W = 800, H = 1067;
const onWhite = (b: Buffer) => sharp(b).resize({ width: W, height: H, fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" }).webp({ quality: 84 });
const modelPhoto = (n: number) => sharp(pg(n)).extract({ left: 3, top: 3, width: 480, height: 793 }).toBuffer();
const fileOf = (code: string, k: number) => `atw-${code.toLowerCase()}-${k}.webp`;

// ---- tiles (same look as the other menus: the photo as a mehrab on wine)
const latticeBg = (w: number, h: number) => { const s = 48, p: string[] = []; for (let x = 0; x <= w + s; x += s) for (let y = 0; y <= h + s; y += s) p.push(`<path d="M${x} ${y - s / 2} L${x + s / 2} ${y} L${x} ${y + s / 2} L${x - s / 2} ${y} Z" fill="none" stroke="#c9a56a" stroke-opacity=".10"/>`);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a0f1c"/><stop offset="1" stop-color="#7d1d3f"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${p.join("")}</svg>`); };
const archPath = (w: number, h: number) => `M0 ${h} V${h * 0.42} C0 ${h * 0.16} ${w * 0.3} ${h * 0.03} ${w / 2} 0 C${w * 0.7} ${h * 0.03} ${w} ${h * 0.16} ${w} ${h * 0.42} V${h} Z`;
async function arch(page: number, w: number, h: number) {
  const photo = await sharp(await modelPhoto(page)).resize({ width: w, height: h, fit: "cover", position: "north" }).png().toBuffer();
  const cut = await sharp(photo).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><path d="${archPath(w, h)}" fill="#fff"/></svg>`), blend: "dest-in" }]).png().toBuffer();
  const line = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><path d="${archPath(w - 4, h - 2)}" transform="translate(2 1)" fill="none" stroke="#c9a56a" stroke-width="4"/></svg>`);
  return sharp(cut).composite([{ input: line }]).png().toBuffer();
}
async function tile(page: number, out: string) {
  const TW = 800, TH = 600, aw = 400, ah = 540;
  await sharp(latticeBg(TW, TH)).composite([{ input: await arch(page, aw, ah), left: (TW - aw) / 2, top: TH - ah - 30 }]).webp({ quality: 86 }).toFile(path.join(PHOTOS, out));
}
async function banner(pages: number[], out: string, w: number, h: number, spec: { x: number; y: number; w: number; h: number }[]) {
  const layers: sharp.OverlayOptions[] = [];
  for (let i = 0; i < pages.length; i++) layers.push({ input: await arch(pages[i], spec[i].w, spec[i].h), left: spec[i].x, top: spec[i].y });
  await sharp(latticeBg(w, h)).composite(layers).webp({ quality: 86 }).toFile(path.join(PHOTOS, out));
}

// ---- menu
const group = (await pool.query("SELECT id FROM categories WHERE slug=$1", [GSLUG])).rows[0]?.id as string | undefined
  ?? (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,NULL,0,true) RETURNING id", [GROUP, GSLUG])).rows[0].id as string;
const sub = new Map<string, string>();
for (const [i, name] of [K, R].entries()) {
  const slug = `${GSLUG}-${slugify(name)}`;
  sub.set(name, (await pool.query("SELECT id FROM categories WHERE slug=$1", [slug])).rows[0]?.id as string
    ?? (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,$3,$4,true) RETURNING id", [name, slug, group, i + 1])).rows[0].id as string);
}
await tile(2, "atc-2026-winter-collection.webp"); await tile(4, "atc-2026-winter-light-khaddar.webp"); await tile(17, "atc-2026-winter-light-karandi.webp");
await pool.query("UPDATE categories SET image_url='/cs/atc-2026-winter-collection.webp' WHERE id=$1", [group]);
await pool.query("UPDATE categories SET image_url='/cs/atc-2026-winter-light-khaddar.webp' WHERE id=$1", [sub.get(K)]);
await pool.query("UPDATE categories SET image_url='/cs/atc-2026-winter-light-karandi.webp' WHERE id=$1", [sub.get(R)]);

// ---- brand
const brandId = (await pool.query("SELECT id FROM brands WHERE name ILIKE 'bonanza%' ORDER BY (name ILIKE 'bonanza satrangi') DESC LIMIT 1")).rows[0]?.id as string | undefined
  ?? (await pool.query("INSERT INTO brands (name, slug) VALUES ('Bonanza Satrangi','bonanza-satrangi') ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id")).rows[0].id as string;

// ---- products
const CARE = "Wash fabric before cutting for perfect stitching. Wash dark and sensitive colours separately. Do not use bleach or chemicals. Iron on medium heat, do not wring, machine wash gentle, line dry.";
let added = 0, skipped = 0;
for (const [page, name, code, price, fabric] of LIST) {
  const sku = `BSW-${code}`, f = fabric.replace("Light ", "");
  await onWhite(await modelPhoto(page)).toFile(path.join(PHOTOS, fileOf(code, 1)));
  // picture 2 = the card without the printed price, barcode, QR code and web address (the bottom right strip, x >= 487 and y >= 688, is painted out)
  await onWhite(await sharp(pg(page)).extract({ left: 2, top: 2, width: 763, height: 796 }).composite([{ input: { create: { width: 278, height: 112, channels: 3, background: "#ffffff" } }, left: 485, top: 686 }]).png().toBuffer()).toFile(path.join(PHOTOS, fileOf(code, 2)));
  if ((await pool.query("SELECT 1 FROM products WHERE sku=$1", [sku])).rowCount) { skipped++; continue; }
  const desc = [`${name} by Bonanza Satrangi, from the Lia unstitched collection: a 3-piece ${f.toLowerCase()} suit for winter 2026, sold unstitched.`,
    `Shirt: digital printed ${fabric.toLowerCase()}, 1.75 m (maximum shirt length up to 42 inch). Dupatta: digital printed ${fabric.toLowerCase()}, 2.50 m. Bottom: printed ${fabric.toLowerCase()}, 1.50 m.`,
    `Article code ${code}. Care: ${CARE}`, "Actual colour may vary slightly from the picture."].join(" ");
  const tags = ["women", "unstitched", "winter", "2026-winter-collection", slugify(f), "lia", "bonanza-satrangi", "3-piece", "digital-print"];
  const slug = slugify(`${name} ${code}`);
  const pid = (await pool.query(
    `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, brand_id, stock_quantity, moq, images, tags, metafields)
     VALUES ($1,$2,$3,$4,'PUBLISHED',$5,$5,$6,$7,1,$8,$9,$10) RETURNING id`,
    [`${name} - ${code}`, slug, sku, desc, price, brandId, STOCK, JSON.stringify([`/cs/${fileOf(code, 1)}`, `/cs/${fileOf(code, 2)}`]), tags,
      JSON.stringify({ source: "bonanza-winter-pdf", pdfPage: page, articleCode: code, collection: "Lia unstitched 2026", pieces: 3, markupApplied: false, retailPrice: price, material: f, madeBy: "Bonanza Satrangi", style: "Unstitched 3 piece",
        seoTitle: `${name} ${code} Lia Winter 2026`.slice(0, 62), seoDescription: `Buy ${name} (${code}), Bonanza Satrangi Lia 3-piece unstitched ${f.toLowerCase()} suit, Rs. ${price.toLocaleString("en-US")}. Cash on delivery across Pakistan.`.slice(0, 158) })])).rows[0].id as string;
  for (const c of [group, sub.get(fabric)!]) await pool.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [pid, c]);
  added++;
}

// ---- home page: a banner and a product row right after the promises strip
await banner([2, 4, 17], "atw-banner.webp", 1600, 560, [{ x: 760, y: 150, w: 250, h: 400 }, { x: 1040, y: 60, w: 310, h: 500 }, { x: 1380, y: 170, w: 210, h: 390 }]);
const row = (await pool.query("SELECT draft, published FROM page_templates WHERE key='home'")).rows[0];
if (row) {
  await pool.query("INSERT INTO template_versions (key, content, label) VALUES ('home', $1, 'Before the winter collection')", [row.published ?? row.draft]);
  const strip = (j: { sections: { id: string }[] }) => j.sections.filter((s) => !/^winter-/.test(s.id));
  const put = (j: { sections: { id: string }[] }) => {
    const base = strip(j), at = Math.max(0, base.findIndex((s) => s.id === "trust-1") + 1);
    base.splice(at, 0,
      { id: "winter-banner", type: "promo-banner", settings: { eyebrow: "New · Winter 2026", heading: "2026 Winter Collection", text: "Lia by Bonanza Satrangi: digital printed light khaddar and karandi, three-piece unstitched suits.", buttonLabel: "Shop the collection", buttonHref: `/collections/${GSLUG}`, imageUrl: "/cs/atw-banner.webp", align: "left", height: "md" } } as never,
      { id: "winter-row", type: "product-carousel", settings: { eyebrow: "Winter 2026", heading: "The 2026 winter suits", categorySlug: GSLUG, count: 12, sort: "newest" } } as never);
    return { sections: sanitizeSections(base as never) };
  };
  await pool.query("UPDATE page_templates SET draft=$1, published=$2, published_at=now(), updated_at=now() WHERE key='home'", [JSON.stringify(put(row.draft ?? row.published)), JSON.stringify(put(row.published ?? row.draft))]);
}
await delPattern("catalog:*").catch(() => {}); await delPattern("categories:*").catch(() => {}); await delPattern("page:*").catch(() => {});
console.log(`winter collection: ${added} products added, ${skipped} already there; menu "${GROUP}" with ${[...sub.keys()].join(", ")}`);
await pool.end();
process.exit(0);
