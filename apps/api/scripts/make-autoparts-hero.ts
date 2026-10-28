// Home banner for the AUTO PARTS shop: carbon-dark backdrop with orange speed lines and a row of four product tiles (floor mat, lighting, wiper blades, key cover) on the right.
// Wide and phone sizes, transparent where possible. DATABASE_URL=postgres://.../shop_autoparts npx tsx scripts/make-autoparts-hero.ts  -> apps/web-autoparts/public/cs/ap-hero-wide.webp and ap-hero-phone.webp
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";

sharp.cache(false);
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/autoparts/.test(db)) throw new Error(`refusing to run on database "${db}"`);
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web-autoparts/public/cs");
const pick = async (re: string) => (await pool.query(`SELECT images->>0 img FROM products WHERE status='PUBLISHED' AND images->>0 LIKE '/cs/ap-%' AND title ~* $1 ORDER BY selling_price DESC OFFSET 1 LIMIT 1`, [re])).rows[0]?.img as string | undefined;
const files: Record<string, string | undefined> = { mat: await pick("floor mat"), light: await pick("light|lamp|led"), wiper: await pick("wiper"), key: await pick("key ?cover|key ?case") };
const TILES = [{ k: "mat", x: 0, y: 0, w: 420, h: 300 }, { k: "light", x: 450, y: 0, w: 300, h: 300 }, { k: "wiper", x: 0, y: 330, w: 300, h: 250 }, { k: "key", x: 330, y: 330, w: 420, h: 250 }] as const;
const tileSvg = (w: number, h: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6e9ee"/></linearGradient></defs><polygon points="0,0 ${w - 26},0 ${w},26 ${w},${h} 0,${h}" fill="url(#t)"/><polygon points="0,0 ${w - 26},0 ${w},26 ${w},${h} 0,${h}" fill="none" stroke="#ff5a1f" stroke-opacity=".55" stroke-width="2"/></svg>`);
const shadowSvg = (w: number, h: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w + 80}" height="${h + 80}"><rect x="40" y="52" width="${w}" height="${h}" fill="#ff5a1f" fill-opacity=".38"/></svg>`);
async function grid(scale: number) {
  const gw = Math.round(750 * scale), gh = Math.round(580 * scale); const layers: sharp.OverlayOptions[] = [];
  for (const t of TILES) {
    const f = files[t.k]; if (!f) continue; const tw = Math.round(t.w * scale), th = Math.round(t.h * scale), tx = Math.round(t.x * scale) + 40, ty = Math.round(t.y * scale) + 40;
    const photo = await sharp(fs.readFileSync(path.join(DIR, path.basename(f)))).trim({ threshold: 14 }).resize({ width: Math.round(tw * 0.86), height: Math.round(th * 0.86), fit: "inside" }).png().toBuffer({ resolveWithObject: true });
    const tile = await sharp(tileSvg(tw, th)).composite([{ input: photo.data, left: Math.round((tw - photo.info.width) / 2), top: Math.round((th - photo.info.height) / 2), blend: "multiply" }]).png().toBuffer();
    layers.push({ input: await sharp(shadowSvg(tw, th)).blur(26).png().toBuffer(), left: tx - 40, top: ty - 40 }, { input: tile, left: tx, top: ty });
  }
  const w = gw + 80, h = gh + 120;
  return { input: await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer(), w, h };
}
const backdrop = (w: number, h: number) => {
  const lines = Array.from({ length: 9 }, (_, i) => { const y = h * (0.12 + i * 0.1); return `<path d="M${w * 0.05} ${y} L${w * (0.55 + i * 0.04)} ${y - 40}" stroke="#ff5a1f" stroke-opacity="${0.05 + (i % 3) * 0.04}" stroke-width="${2 + (i % 3)}"/>`; }).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="a" cx=".8" cy=".45" r=".5"><stop offset="0" stop-color="#ff5a1f" stop-opacity=".32"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#a)"/>${lines}</svg>`);
};
const clear = (w: number, h: number) => ({ create: { width: w, height: h, channels: 4 as const, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
const WW = 1920, WH = 960; const g1 = await grid(1);
await sharp(clear(WW, WH)).composite([{ input: backdrop(WW, WH), left: 0, top: 0 }, { input: g1.input, left: 980, top: Math.round((WH - g1.h) / 2) }]).webp({ quality: 90 }).toFile(path.join(DIR, "ap-hero-wide.webp"));
const PW = 1000, PH = 625; const g2 = await grid(0.6);
await sharp(clear(PW, PH)).composite([{ input: backdrop(PW, PH), left: 0, top: 0 }, { input: g2.input, left: Math.round((PW - g2.w) / 2), top: Math.round((PH - g2.h) / 2) }]).webp({ quality: 90 }).toFile(path.join(DIR, "ap-hero-phone.webp"));
console.log("autoparts banners written:", Object.entries(files).map(([k, v]) => `${k}=${v ? "ok" : "none"}`).join(", "));
await pool.end();
process.exit(0);
