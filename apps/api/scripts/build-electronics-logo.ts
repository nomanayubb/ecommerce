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

// 1. flat, solid-colour version of the glossy 3D logo (the shop's own style is flat and solid, not gradients):
//    the cream background is removed (tight test, so pale silver highlights are kept), then every shape pixel becomes ONE solid blue or ONE solid silver.
// Everything is worked out at 2x size and shrunk at the end, so the edges are anti-aliased (smooth) instead of stair-stepped.
const SS = 2;
const src0 = await sharp(SRC).metadata();
const { data, info } = await sharp(SRC).removeAlpha().resize({ width: src0.width! * SS, height: src0.height! * SS, kernel: "lanczos3" }).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const BLUE = [47, 93, 170], SILVER = [184, 190, 199];
const N = W * H;
const isBg = new Uint8Array(N), blue = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
  const d = Math.hypot(r - 245, g - 241, b - 230);
  isBg[i] = d < 13 || (d < 26 && r - b >= 9) ? 1 : 0;        // cream is warm (red above blue); silver highlights are neutral or cool
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  blue[i] = !isBg[i] && mx > 0 && (mx - mn) / mx > 0.32 && b > r + 25 ? 1 : 0;
}
const y0 = 790 * SS;                                              // the old tagline and its lines
const dil = (src: Uint8Array) => { const o = new Uint8Array(N); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; o[i] = src[i] | src[i - 1] | src[i + 1] | src[i - W] | src[i + W] | src[i - W - 1] | src[i - W + 1] | src[i + W - 1] | src[i + W + 1]; } return o; };
const blueNear = dil(dil(blue));
const mask = new Uint8Array(N * 4);                          // 0/255 shape mask, softened below for anti-aliased edges
const rgba = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const inside = !isBg[i] && Math.floor(i / W) < y0;
  const c = blueNear[i] ? BLUE : SILVER;
  rgba[i * 4] = c[0]; rgba[i * 4 + 1] = c[1]; rgba[i * 4 + 2] = c[2]; rgba[i * 4 + 3] = inside ? 255 : 0;
}
const flat = new Uint8Array(N); for (let i = 0; i < N; i++) flat[i] = rgba[i * 4 + 3];
const soft = await sharp(Buffer.from(flat), { raw: { width: W, height: H, channels: 1 } }).blur(0.9 * SS).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
if (soft.info.channels !== 1 || soft.data.length !== N) throw new Error(`unexpected mask shape: ${soft.info.channels} channels, ${soft.data.length} bytes`);
const alpha = soft.data;
for (let i = 0; i < N; i++) rgba[i * 4 + 3] = alpha[i] < 40 ? 0 : alpha[i] > 215 ? 255 : alpha[i];
void mask;
const keyed = sharp(await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).resize({ width: W / SS, height: H / SS, kernel: "lanczos3" }).png().toBuffer());
const part = async (top: number, bottom: number) => sharp(await keyed.clone().extract({ left: 0, top, width: W / SS, height: bottom - top }).png().toBuffer()).trim({ threshold: 1 }).png().toBuffer();
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
  const GAP = 40, TAG_H = 60, w = Math.max(wm.width!, mm.width!);
  const canvasH = mm.height! + GAP + wm.height! + GAP + TAG_H;
  const full = sharp({ create: { width: w, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
    { input: mark, left: Math.round((w - mm.width!) / 2), top: 0 },
    { input: word, left: Math.round((w - wm.width!) / 2), top: mm.height! + GAP },
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
