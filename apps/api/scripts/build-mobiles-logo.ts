// AVERIXA MOBILES wordmark logo (flat, solid colours): an indigo rounded-square "A" with a small camera dot, "AVERIXA" in bold with "MOBILES" spaced out below it.
// Writes light-theme and dark-theme files to apps/web-mobiles/public/brand/mobiles/.   npx tsx scripts/build-mobiles-logo.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web-mobiles/public/brand/mobiles");
fs.mkdirSync(OUT, { recursive: true });
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const mark = (box: string, a: string) => `<rect width="170" height="170" rx="40" fill="${box}"/><path d="M85 40 L128 128 H108 L99 108 H71 L62 128 H42 Z M78 90 H92 L85 70 Z" fill="${a}" fill-rule="evenodd"/><circle cx="85" cy="24" r="5" fill="${a}" fill-opacity=".85"/>`;
const horizontal = (ink: string, accent: string, boxFill: string, markInk: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="170" viewBox="0 0 900 170">${mark(boxFill, markInk)}` +
  `<text x="210" y="98" font-family="${FONT}" font-weight="700" font-size="92" letter-spacing="3" fill="${ink}">AVERIXA</text>` +
  `<text x="214" y="148" font-family="${FONT}" font-weight="600" font-size="34" letter-spacing="17" fill="${accent}">MOBILES</text></svg>`;
const full = (ink: string, accent: string, boxFill: string, markInk: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="330" viewBox="0 0 620 330"><g transform="translate(225 0)">${mark(boxFill, markInk)}</g>` +
  `<text x="310" y="248" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="84" letter-spacing="3" fill="${ink}">AVERIXA</text>` +
  `<text x="318" y="305" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="32" letter-spacing="16" fill="${accent}">MOBILES</text></svg>`;
const save = async (svg: string, name: string, w: number) => {
  const img = sharp(Buffer.from(svg), { density: 300 }).resize({ width: w });
  await img.clone().webp({ quality: 95, alphaQuality: 100 }).toFile(path.join(OUT, `${name}.webp`)); await img.clone().png().toFile(path.join(OUT, `${name}.png`));
};
const L = { ink: "#111827", accent: "#4f46e5", box: "#4f46e5", mark: "#ffffff" }, D = { ink: "#f5f6fb", accent: "#a5a8ff", box: "#6366f1", mark: "#ffffff" };
await save(horizontal(L.ink, L.accent, L.box, L.mark), "logo-horizontal", 1800); await save(horizontal(D.ink, D.accent, D.box, D.mark), "logo-horizontal-dark", 1800);
await save(full(L.ink, L.accent, L.box, L.mark), "logo-full", 1240); await save(full(D.ink, D.accent, D.box, D.mark), "logo-full-dark", 1240);
const markSvg = (b: string, a: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="170" height="170" viewBox="0 0 170 170">${mark(b, a)}</svg>`;
await save(markSvg(L.box, L.mark), "logo-mark", 512); await save(markSvg(D.box, D.mark), "logo-mark-dark", 512);
await sharp(Buffer.from(markSvg(L.box, L.mark)), { density: 300 }).resize(192, 192).png().toFile(path.join(OUT, "icon-192.png"));
await sharp(Buffer.from(markSvg(L.box, L.mark)), { density: 300 }).resize(512, 512).png().toFile(path.join(OUT, "icon-512.png"));
console.log("written:", fs.readdirSync(OUT).join(", "));
