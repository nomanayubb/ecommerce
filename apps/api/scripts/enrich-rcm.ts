// Adds the rest of each RCM product's detail to the products already imported into the MOBILES shop: every picture of the gallery (framed square on white) and the full description
// from the product page. Run with DATABASE_URL = shop_mobiles:  npx tsx scripts/enrich-rcm.ts <rcm-full.json> [--photos dir]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";

sharp.cache(false);
const file = process.argv[2]; if (!file) throw new Error("usage: enrich-rcm.ts <rcm-full.json> [--photos dir]");
const here = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS = path.resolve(process.argv.includes("--photos") ? process.argv[process.argv.indexOf("--photos") + 1] : path.join(here, "../../web-mobiles/public/cs"));
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/mobiles/.test(db)) throw new Error(`refusing to run on database "${db}"`);
const UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import)";
const W1252 = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const clean1252 = (s: string) => Array.from(s).filter((ch) => { const c = ch.codePointAt(0)!; return c < 0x100 || W1252.has(ch); }).join("").replace(/[ \t]{2,}/g, " ").trim();
const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;|&#39;|&rsquo;|&lsquo;/g, "'");
const text = (html: string) => decode(html.replace(/<(br|\/p|\/li|\/div|\/h\d)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const get = async (url: string) => { for (let t = 0; t < 3; t++) { try { const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60000) }); if (r.ok) return await r.text(); if (r.status === 404) return ""; } catch { /* retry */ } await new Promise((r) => setTimeout(r, 1200 * (t + 1))); } return ""; };
async function frame(url: string, out: string) {
  let buf: Buffer | null = null;
  for (let t = 0; t < 3 && !buf; t++) { try { const r = await fetch(encodeURI(url), { headers: { "user-agent": UA }, signal: AbortSignal.timeout(40000) }); if (r.ok) buf = Buffer.from(await r.arrayBuffer()); else if (r.status < 429) break; } catch { /* retry */ } if (!buf) await new Promise((r) => setTimeout(r, 1200 * (t + 1))); }
  if (!buf) return false;
  try {
    const flat = sharp(buf).rotate().flatten({ background: "#ffffff" }); const tr = await flat.clone().trim({ threshold: 14 }).toBuffer({ resolveWithObject: true }); const m = await flat.clone().metadata();
    const ok = tr.info.width >= (m.width ?? 0) * 0.15 && tr.info.height >= (m.height ?? 0) * 0.15;
    const fit = await sharp(ok ? tr.data : await flat.toBuffer()).resize({ width: 810, height: 810, fit: "inside" }).toBuffer();
    await sharp({ create: { width: 900, height: 900, channels: 4, background: "#ffffff" } }).composite([{ input: fit, gravity: "centre" }]).webp({ quality: 80 }).toFile(path.join(PHOTOS, out));
    return true;
  } catch { return false; }
}
const data = JSON.parse(fs.readFileSync(file, "utf8")) as { products: { url: string; name: string; img?: string }[] };
const rows = (await pool.query("SELECT id, slug, images, description, metafields->>'srcUrl' u FROM products WHERE metafields->>'source'='rcm-multimedia'")).rows as { id: string; slug: string; images: string[]; description: string; u: string }[];
let i = 0, moreImgs = 0, longer = 0;
async function one(r: (typeof rows)[number]) {
  const h = await get(r.u); if (!h) return;
  const g = h.slice(h.indexOf("Images slider"), h.indexOf("End Images slider"));
  const urls = [...new Set([...g.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]))];
  const own = r.images[0] ? path.basename(r.images[0]) : "";
  const images = [...r.images]; let k = images.length + 1;
  const first = data.products.find((p) => p.url === r.u)?.img;
  for (const u of urls) {
    if (u === first || (first && u.split("/").pop() === first.split("/").pop()) || images.length >= 8) continue;
    const f = `${own ? own.replace(/\.webp$/, "") : "m-" + r.slug}-${k}.webp`;
    if (await frame(u, f)) { images.push(`/cs/${f}`); k++; moreImgs++; }
  }
  const dm = /id="description"[\s\S]*?<div class="single-des">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/.exec(h)?.[1];
  let desc = dm ? clean1252(text(dm)) : "";
  if (desc.length > r.description.length + 20) { longer++; } else desc = r.description;
  await pool.query("UPDATE products SET images=$2, description=$3, updated_at=now() WHERE id=$1", [r.id, JSON.stringify(images), desc.slice(0, 4000)]);
}
await Promise.all(Array.from({ length: 6 }, async () => { while (i < rows.length) { const r = rows[i++]; await one(r).catch((e) => console.log(`  ${r.slug}: ${(e as Error).message}`)); } }));
await delPattern("catalog:*").catch(() => {});
console.log(`products checked: ${rows.length}; extra pictures added: ${moreImgs}; fuller descriptions: ${longer}`);
await pool.end();
process.exit(0);
