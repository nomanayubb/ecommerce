// Picture of the "AC & Cooling" menu of the ELECTRONICS shop: a floor-standing air conditioner, a split air conditioner and an air cooler, standing on one line.
//   npx tsx scripts/make-ac-picture.ts          -> apps/web-electronics/public/cs/ec-air-conditioners-and-cooling.webp (the database already points at this file name)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

sharp.cache(false);
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web-electronics/public/cs");
const W = 800, H = 600;
const bg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f8fc"/><stop offset="1" stop-color="#e3eaf5"/></linearGradient>` +
  `<radialGradient id="r" cx=".5" cy=".45" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
  `<rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#r)"/>` +
  `<g stroke="#1f4fa8" stroke-opacity=".10" stroke-width="2" fill="none"><path d="M0 70H120V140H220M800 90H700V150H620M0 520H90V470M800 540H720V490"/></g>` +
  `<g fill="#1f4fa8" fill-opacity=".14"><circle cx="220" cy="140" r="5"/><circle cx="620" cy="150" r="5"/><circle cx="90" cy="470" r="5"/><circle cx="720" cy="490" r="5"/></g></svg>`);
const shadow = (w: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="50"><ellipse cx="${w / 2}" cy="25" rx="${w * 0.38}" ry="10" fill="#0f2a55" fill-opacity=".22"/></svg>`);
const fit = async (file: string, w: number, h: number) => sharp(fs.readFileSync(path.join(DIR, file))).trim({ threshold: 14 }).resize({ width: w, height: h, fit: "inside" }).png().toBuffer({ resolveWithObject: true });

// all three stand on the same floor line (y = 500) and are centred in their own third
const BASE = 500;
const items = [
  { f: "e-gree-floor-standing-inverter-a-c-gf-36tfih-h-and-c-white.webp", cx: 165, w: 190, h: 400 },   // tower
  { f: "e-lg-split-inverter-a-c-s4nwbdk2f31-2-ton-no-color.webp", cx: 392, w: 262, h: 190, lift: 150 },   // split unit, hung high like on a wall
  { f: "e-canon-air-cooler-ca-6500-m-snow-fall-turqoise-green.webp", cx: 662, w: 220, h: 350 },          // air cooler
];
const layers: sharp.OverlayOptions[] = [];
for (const it of items) {
  const { data, info } = await fit(it.f, it.w, it.h);
  const bottom = BASE - (it.lift ?? 0);
  layers.push({ input: data, left: Math.round(it.cx - info.width / 2), top: bottom - info.height, blend: "multiply" });
  if (!it.lift) layers.push({ input: shadow(info.width + 40), left: Math.round(it.cx - (info.width + 40) / 2), top: BASE - 14 });
}
await sharp(bg).composite(layers).webp({ quality: 88 }).toFile(path.join(DIR, "ec-air-conditioners-and-cooling.webp"));
console.log("AC & Cooling picture written");
