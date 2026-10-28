// AVERIXA AUTO PARTS logo (flat, solid colours): a signal-orange hexagon nut with a white chevron "A" and a bolt circle, "AVERIXA" in heavy italic capitals, "AUTO PARTS" spaced out in steel.
// Light-theme and dark-theme files go to apps/web-autoparts/public/brand/autoparts/.   npx tsx scripts/build-autoparts-logo.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web-autoparts/public/brand/autoparts");
fs.mkdirSync(OUT, { recursive: true });
const FONT = "Bahnschrift, 'Arial Narrow', 'Segoe UI', Arial, sans-serif";
const mark = (hex: string, ink: string) =>
  `<polygon points="85,4 160,45 160,125 85,166 10,125 10,45" fill="${hex}"/><polygon points="85,22 144,54 144,116 85,148 26,116 26,54" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="3"/>` +
  `<path d="M85 40 L126 126 H103 L96 108 H74 L67 126 H44 Z M80 90 H90 L85 72 Z" fill="${ink}" fill-rule="evenodd"/><circle cx="85" cy="150" r="0" fill="${ink}"/>`;
const horizontal = (hex: string, ink: string, steel: string, word: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="170" viewBox="0 0 960 170">${mark(hex, ink)}` +
  `<text x="196" y="100" font-family="${FONT}" font-weight="800" font-style="italic" font-size="96" letter-spacing="1" fill="${word}">AVERIXA</text>` +
  `<text x="200" y="150" font-family="${FONT}" font-weight="700" font-size="34" letter-spacing="19" fill="${steel}">AUTO PARTS</text></svg>`;
const full = (hex: string, ink: string, steel: string, word: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="340" viewBox="0 0 640 340"><g transform="translate(235 0)">${mark(hex, ink)}</g>` +
  `<text x="320" y="252" text-anchor="middle" font-family="${FONT}" font-weight="800" font-style="italic" font-size="88" fill="${word}">AVERIXA</text>` +
  `<text x="330" y="312" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="32" letter-spacing="17" fill="${steel}">AUTO PARTS</text></svg>`;
const save = async (svg: string, name: string, w: number) => {
  const img = sharp(Buffer.from(svg), { density: 300 }).resize({ width: w });
  await img.clone().webp({ quality: 95, alphaQuality: 100 }).toFile(path.join(OUT, `${name}.webp`)); await img.clone().png().toFile(path.join(OUT, `${name}.png`));
};
const L = { hex: "#ff5a1f", ink: "#ffffff", steel: "#5b6472", word: "#14161b" }, D = { hex: "#ff6a2b", ink: "#14161b", steel: "#a7b0bf", word: "#f4f5f7" };
await save(horizontal(L.hex, L.ink, L.steel, L.word), "logo-horizontal", 1900); await save(horizontal(D.hex, D.ink, D.steel, D.word), "logo-horizontal-dark", 1900);
await save(full(L.hex, L.ink, L.steel, L.word), "logo-full", 1280); await save(full(D.hex, D.ink, D.steel, D.word), "logo-full-dark", 1280);
const markSvg = (c: { hex: string; ink: string }) => `<svg xmlns="http://www.w3.org/2000/svg" width="170" height="170" viewBox="0 0 170 170">${mark(c.hex, c.ink)}</svg>`;
await save(markSvg(L), "logo-mark", 512); await save(markSvg(D), "logo-mark-dark", 512);
await sharp(Buffer.from(markSvg(L)), { density: 300 }).resize(192, 192).png().toFile(path.join(OUT, "icon-192.png"));
await sharp(Buffer.from(markSvg(L)), { density: 300 }).resize(512, 512).png().toFile(path.join(OUT, "icon-512.png"));
console.log("written:", fs.readdirSync(OUT).join(", "));
