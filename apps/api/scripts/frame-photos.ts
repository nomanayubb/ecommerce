// Re-frames downloaded product photos so the product fills the card: trims the empty border, fits the product into a square canvas (like the shop's product cards)
// with a plain white background, so white appliances (fridges, washing machines) stay visible instead of vanishing into a white card.
//   npx tsx scripts/frame-photos.ts <file-prefix> [--dry]        e.g.  npx tsx scripts/frame-photos.ts e-      (only files in apps/web/public/cs/ that start with the prefix)
// Safe to re-run: an already framed photo (square canvas, 900x900) is skipped.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

sharp.cache(false);   // never keep files open (a held handle makes Windows refuse the rewrite)

const prefix = process.argv[2];
if (!prefix) throw new Error("usage: frame-photos.ts <file-prefix> [--dry]");
const dry = process.argv.includes("--dry");
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/public/cs");
const W = 900, H = 900, FILL = 0.9, BG = { r: 255, g: 255, b: 255, alpha: 1 };
const files = fs.readdirSync(DIR).filter((f) => f.startsWith(prefix) && f.endsWith(".webp"));
let done = 0, skipped = 0, failed = 0;
for (const f of files) {
  const p = path.join(DIR, f);
  try {
    const input = fs.readFileSync(p);
    const meta = await sharp(input).metadata();
    if (meta.width === W && meta.height === H) { skipped++; continue; }
    let img = sharp(input).flatten({ background: "#ffffff" });
    const trimmed = await img.clone().trim({ threshold: 14 }).toBuffer({ resolveWithObject: true });
    const ok = trimmed.info.width >= (meta.width ?? 0) * 0.15 && trimmed.info.height >= (meta.height ?? 0) * 0.15;   // never trust a trim that ate the picture
    const src = ok ? trimmed.data : await img.toBuffer();
    const fit = await sharp(src).resize({ width: Math.round(W * FILL), height: Math.round(H * FILL), fit: "inside", withoutEnlargement: false }).toBuffer();
    const out = await sharp({ create: { width: W, height: H, channels: 4, background: BG } }).composite([{ input: fit, gravity: "centre" }]).webp({ quality: 78 }).toBuffer();
    if (!dry) fs.writeFileSync(p, out);
    done++;
  } catch (e) { failed++; console.log(`  ${f}: ${(e as Error).message}`); }
}
console.log(`${files.length} photos with prefix "${prefix}": ${done} framed${dry ? " (dry run, nothing written)" : ""}, ${skipped} already framed, ${failed} failed`);
