// Home banner for the ELECTRONICS shop: a dark navy banner with faint circuit traces and a tidy grid of four product tiles (refrigerator, TV, air conditioner, washing machine) on the
// right, leaving the left free for the headline. Two sizes: wide (desktop) and phone. Nothing important sits near an edge, so the page can crop slightly without cutting a product.
//   DATABASE_URL=postgres://.../shop_electronics npx tsx scripts/make-hero-picture.ts   -> apps/web-electronics/public/cs/ec-hero-wide.webp and ec-hero-phone.webp
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";

sharp.cache(false);
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/electronics/.test(db)) throw new Error(`refusing to run on database "${db}"`);
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web-electronics/public/cs");
const pick = async (slug: string) => (await pool.query(
  `SELECT p.images->>0 img FROM products p JOIN product_categories pc ON pc.product_id=p.id JOIN categories c ON c.id=pc.category_id
   WHERE c.slug=$1 AND p.status='PUBLISHED' AND p.images->>0 LIKE '/cs/e-%' AND p.brand_id IS NOT NULL ORDER BY p.selling_price DESC OFFSET 2 LIMIT 1`, [slug])).rows[0]?.img as string;
const files = { fridge: await pick("refrigerators"), tv: await pick("led-tv"), ac: await pick("air-conditioners-split"), washer: await pick("washing-machines") };

// the tile grid, in its own 860 x 600 box: a tall tile (fridge), a wide tile (TV) and two small tiles (AC, washer) below the TV
const TILES = [
  { k: "fridge", x: 0, y: 0, w: 280, h: 600 },
  { k: "tv", x: 310, y: 0, w: 550, h: 300 },
  { k: "ac", x: 310, y: 330, w: 262, h: 270 },
  { k: "washer", x: 598, y: 330, w: 262, h: 270 },
] as const;

const tileSvg = (w: number, h: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfcff"/><stop offset="1" stop-color="#e4ebf6"/></linearGradient></defs><rect width="${w}" height="${h}" rx="18" fill="url(#t)"/></svg>`);
const shadowSvg = (w: number, h: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w + 60}" height="${h + 60}"><rect x="30" y="38" width="${w}" height="${h}" rx="18" fill="#000" fill-opacity=".45"/></svg>`);

async function grid(scale: number): Promise<{ input: Buffer; w: number; h: number }> {
  const gw = Math.round(860 * scale), gh = Math.round(600 * scale);
  const layers: sharp.OverlayOptions[] = [];
  for (const t of TILES) {
    const tw = Math.round(t.w * scale), th = Math.round(t.h * scale), tx = Math.round(t.x * scale), ty = Math.round(t.y * scale);
    const file = (files as Record<string, string>)[t.k]; if (!file) continue;
    const photo = await sharp(fs.readFileSync(path.join(DIR, path.basename(file)))).trim({ threshold: 14 })
      .resize({ width: Math.round(tw * 0.88), height: Math.round(th * 0.88), fit: "inside" }).png().toBuffer({ resolveWithObject: true });
    const tile = await sharp(tileSvg(tw, th)).composite([{ input: photo.data, left: Math.round((tw - photo.info.width) / 2), top: Math.round((th - photo.info.height) / 2), blend: "multiply" }]).png().toBuffer();
    layers.push({ input: await sharp(shadowSvg(tw, th)).blur(14).png().toBuffer(), left: tx - 30, top: ty - 30 }, { input: tile, left: tx, top: ty });
  }
  const canvas = await sharp({ create: { width: gw + 60, height: gh + 90, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers.map((l) => ({ ...l, left: (l.left ?? 0) + 30, top: (l.top ?? 0) + 30 }))).png().toBuffer();
  return { input: canvas, w: gw + 60, h: gh + 90 };
}

// transparent banner: only a faint blue glow behind the tiles and thin circuit traces, so the page's own dark background shows through (calm and professional, not a solid blue slab)
const background = (w: number, h: number, circuitX: number) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="g" cx=".72" cy=".5" r=".55"><stop offset="0" stop-color="#4f8ded" stop-opacity=".16"/><stop offset="1" stop-color="#4f8ded" stop-opacity="0"/></radialGradient></defs>` +
  `<rect width="${w}" height="${h}" fill="url(#g)"/><g stroke="#4f8ded" stroke-opacity=".10" stroke-width="2" fill="none"><path d="M${circuitX} ${h * 0.18}H${circuitX + 120}V${h * 0.3}H${circuitX + 260}M${w} ${h * 0.82}H${w - 140}V${h * 0.7}H${w - 300}M${circuitX + 40} ${h}V${h * 0.9}H${circuitX + 180}"/></g>` +
  `<g fill="#4f8ded" fill-opacity=".18"><circle cx="${circuitX + 260}" cy="${h * 0.3}" r="6"/><circle cx="${w - 300}" cy="${h * 0.7}" r="6"/><circle cx="${circuitX + 180}" cy="${h * 0.9}" r="6"/></g></svg>`);
const clear = (w: number, h: number) => ({ create: { width: w, height: h, channels: 4 as const, background: { r: 0, g: 0, b: 0, alpha: 0 } } });

// wide banner 1920 x 960: tile grid on the right half (x 960..1820), vertically centred
const WW = 1920, WH = 960;
const g1 = await grid(1);
await sharp(clear(WW, WH)).composite([{ input: background(WW, WH, 980), left: 0, top: 0 }, { input: g1.input, left: 940, top: Math.round((WH - g1.h) / 2) }]).webp({ quality: 88 }).toFile(path.join(DIR, "ec-hero-wide.webp"));
// phone banner 1000 x 625 (16:10): the same grid scaled to fit, centred
const PW = 1000, PH = 625;
const g2 = await grid(0.64);
await sharp(clear(PW, PH)).composite([{ input: background(PW, PH, 60), left: 0, top: 0 }, { input: g2.input, left: Math.round((PW - g2.w) / 2), top: Math.round((PH - g2.h) / 2) }]).webp({ quality: 88 }).toFile(path.join(DIR, "ec-hero-phone.webp"));
console.log("home banners written (wide and phone)");
await pool.end();
process.exit(0);
