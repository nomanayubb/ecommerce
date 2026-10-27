// Builds the AVERIXA ELECTRONICS logo set from brand-source/logo-electronics.jpg into apps/web/public/brand/electronics/ (the main shop's logo files are NOT touched):
// the cream background is keyed out, the old tagline is replaced by "ELECTRONICS", and a light-theme and a dark-theme version of each file is written.
//   npx tsx scripts/build-electronics-logo.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC = path.join(root, "brand-source/logo-electronics.jpg");
const OUT = path.join(root, "apps/web/public/brand/electronics");
fs.mkdirSync(OUT, { recursive: true });

// 1. key out the cream background (soft edge, colour un-mixed from the background so edges stay clean)
const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const BG = [245, 241, 230], D0 = 9, D1 = 30;
const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
  const d = Math.hypot(r - BG[0], g - BG[1], b - BG[2]);
  let a = Math.min(1, Math.max(0, (d - D0) / (D1 - D0)));
  const y = Math.floor(i / W);
  if (y >= 790) a = 0;                         // the old tagline and its lines
  const un = (v: number, bg: number) => (a > 0 ? Math.min(255, Math.max(0, (v - (1 - a) * bg) / a)) : 0);
  rgba[i * 4] = un(r, BG[0]); rgba[i * 4 + 1] = un(g, BG[1]); rgba[i * 4 + 2] = un(b, BG[2]); rgba[i * 4 + 3] = Math.round(a * 255);
}
const keyed = sharp(rgba, { raw: { width: W, height: H, channels: 4 } });
const part = async (top: number, bottom: number) => sharp(await keyed.clone().extract({ left: 0, top, width: W, height: bottom - top }).png().toBuffer()).trim({ threshold: 1 }).png().toBuffer();
const mark = await part(0, 625), word = await part(625, 790);       // the "A + cart" symbol and the AVERIXA letters

const INK = "#1b1d1c", CREAM = "#f5f1e6";
const textSvg = (w: number, h: number, size: number, spacing: number, color: string, lines: boolean) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g fill="${color}" stroke="${color}">` +
  `<text x="${w / 2}" y="${h / 2 + size * 0.36}" text-anchor="middle" font-family="Montserrat, 'Segoe UI', Arial, sans-serif" font-weight="600" font-size="${size}" letter-spacing="${spacing}" stroke="none">ELECTRONICS</text>` +
  (lines ? `<line x1="0" y1="${h / 2}" x2="${w * 0.18}" y2="${h / 2}" stroke-width="2"/><line x1="${w * 0.82}" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke-width="2"/>` : "") +
  `</g></svg>`);

const save = async (img: sharp.Sharp, name: string) => { await img.clone().webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(OUT, `${name}.webp`)); await img.clone().png().toFile(path.join(OUT, `${name}.png`)); };
const wm = await sharp(word).metadata(), mm = await sharp(mark).metadata();

for (const [suffix, color] of [["", INK], ["-dark", CREAM]] as const) {
  // full logo: symbol, wordmark, then "ELECTRONICS" between two lines, as in the original layout
  const GAP = 40, TAG_H = 60, w = wm.width!;
  const canvasH = mm.height! + GAP + wm.height! + GAP + TAG_H;
  const full = sharp({ create: { width: w, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
    { input: mark, left: Math.round((w - mm.width!) / 2), top: 0 },
    { input: word, left: 0, top: mm.height! + GAP },
    { input: textSvg(w, TAG_H, 46, 14, color, true), left: 0, top: mm.height! + GAP + wm.height! + GAP },
  ]).png();
  await save(sharp(await full.toBuffer()), `logo-full${suffix}`);

  // horizontal lockup for the header: symbol on the left, wordmark with "ELECTRONICS" under it on the right
  const MH = 150, mw = Math.round((mm.width! / mm.height!) * MH), WW = 420, wh = Math.round((wm.height! / wm.width!) * WW), TH = 34;
  const hz = sharp({ create: { width: mw + 36 + WW, height: MH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
    { input: await sharp(mark).resize({ height: MH }).toBuffer(), left: 0, top: 0 },
    { input: await sharp(word).resize({ width: WW }).toBuffer(), left: mw + 36, top: Math.round((MH - wh - TH - 8) / 2) },
    { input: textSvg(WW, TH, 22, 9, color, false), left: mw + 36, top: Math.round((MH - wh - TH - 8) / 2) + wh + 8 },
  ]).png();
  await save(sharp(await hz.toBuffer()), `logo-horizontal${suffix}`);
}
await save(sharp(mark).png(), "logo-mark");
await sharp(mark).resize({ width: 192, height: 192, fit: "contain", background: { r: 12, g: 12, b: 14, alpha: 1 } }).png().toFile(path.join(OUT, "icon-192.png"));
await sharp(mark).resize({ width: 512, height: 512, fit: "contain", background: { r: 12, g: 12, b: 14, alpha: 1 } }).png().toFile(path.join(OUT, "icon-512.png"));
console.log("written:", fs.readdirSync(OUT).join(", "));
