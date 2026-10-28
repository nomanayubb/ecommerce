// Home banner for the MOBILES shop: soft aurora glows (indigo, cyan, violet) on a transparent background with four rounded product tiles (earbuds, power bank, charger, speaker/watch) on the
// right, leaving the left free for the headline. Wide (desktop) and phone sizes; nothing important near an edge.
//   DATABASE_URL=postgres://.../shop_mobiles npx tsx scripts/make-mobiles-hero.ts   -> apps/web-mobiles/public/cs/mob-hero-wide.webp and mob-hero-phone.webp
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";

sharp.cache(false);
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/mobiles/.test(db)) throw new Error(`refusing to run on database "${db}"`);
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web-mobiles/public/cs");
const pick = async (tag: string, notTag?: string) => (await pool.query(
  `SELECT images->>0 img FROM products WHERE status='PUBLISHED' AND $1 = ANY(tags) AND ($2::text IS NULL OR NOT ($2 = ANY(tags))) AND images->>0 LIKE '/cs/m-%' ORDER BY selling_price DESC OFFSET 2 LIMIT 1`, [tag, notTag ?? null])).rows[0]?.img as string | undefined;
const files: Record<string, string | undefined> = { buds: await pick("earbuds"), bank: await pick("power-bank"), charger: await pick("charger", "cable"), spk: (await pick("speaker")) ?? (await pick("watch")) ?? (await pick("handsfree")) };
const TILES = [{ k: "buds", x: 0, y: 0, w: 340, h: 560 }, { k: "bank", x: 370, y: 0, w: 480, h: 280 }, { k: "charger", x: 370, y: 310, w: 230, h: 250 }, { k: "spk", x: 630, y: 310, w: 220, h: 250 }] as const;
const tileSvg = (w: number, h: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9ebf6"/></linearGradient></defs><rect width="${w}" height="${h}" rx="30" fill="url(#t)"/><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="30" fill="none" stroke="#6366f1" stroke-opacity=".25"/></svg>`);
const shadowSvg = (w: number, h: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w + 80}" height="${h + 80}"><rect x="40" y="52" width="${w}" height="${h}" rx="30" fill="#4f46e5" fill-opacity=".55"/></svg>`);
async function grid(scale: number) {
  const gw = Math.round(850 * scale), gh = Math.round(560 * scale); const layers: sharp.OverlayOptions[] = [];
  for (const t of TILES) {
    const f = files[t.k]; if (!f) continue; const tw = Math.round(t.w * scale), th = Math.round(t.h * scale), tx = Math.round(t.x * scale) + 40, ty = Math.round(t.y * scale) + 40;
    const photo = await sharp(fs.readFileSync(path.join(DIR, path.basename(f)))).trim({ threshold: 14 }).resize({ width: Math.round(tw * 0.86), height: Math.round(th * 0.86), fit: "inside" }).png().toBuffer({ resolveWithObject: true });
    const tile = await sharp(tileSvg(tw, th)).composite([{ input: photo.data, left: Math.round((tw - photo.info.width) / 2), top: Math.round((th - photo.info.height) / 2), blend: "multiply" }]).png().toBuffer();
    layers.push({ input: await sharp(shadowSvg(tw, th)).blur(26).png().toBuffer(), left: tx - 40, top: ty - 40 }, { input: tile, left: tx, top: ty });
  }
  const w = gw + 80, h = gh + 120;
  return { input: await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer(), w, h };
}
const aurora = (w: number, h: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="a" cx=".78" cy=".42" r=".5"><stop offset="0" stop-color="#6366f1" stop-opacity=".42"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></radialGradient><radialGradient id="b" cx=".95" cy=".95" r=".45"><stop offset="0" stop-color="#22d3ee" stop-opacity=".30"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient><radialGradient id="c" cx=".6" cy=".05" r=".4"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".30"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#a)"/><rect width="${w}" height="${h}" fill="url(#b)"/><rect width="${w}" height="${h}" fill="url(#c)"/></svg>`);
const clear = (w: number, h: number) => ({ create: { width: w, height: h, channels: 4 as const, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
const WW = 1920, WH = 960; const g1 = await grid(1);
await sharp(clear(WW, WH)).composite([{ input: aurora(WW, WH), left: 0, top: 0 }, { input: g1.input, left: 960, top: Math.round((WH - g1.h) / 2) }]).webp({ quality: 90 }).toFile(path.join(DIR, "mob-hero-wide.webp"));
const PW = 1000, PH = 625; const g2 = await grid(0.6);
await sharp(clear(PW, PH)).composite([{ input: aurora(PW, PH), left: 0, top: 0 }, { input: g2.input, left: Math.round((PW - g2.w) / 2), top: Math.round((PH - g2.h) / 2) }]).webp({ quality: 90 }).toFile(path.join(DIR, "mob-hero-phone.webp"));
console.log("mobiles banners written:", Object.entries(files).map(([k, v]) => `${k}=${v ? "ok" : "none"}`).join(", "));
await pool.end();
process.exit(0);
