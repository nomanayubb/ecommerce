// Imports the whole RCM Multimedia catalogue (menus, sub menus, products, pictures, filters) into the CURRENT database (set DATABASE_URL to shop_mobiles), with the shop's sliding mark-up.
//   DATABASE_URL=postgres://.../shop_mobiles npx tsx scripts/import-rcm.ts <rcm-full.json> [--photos <dir>] [--publish]
// rcm-full.json = the scraped list (menus + products with price, picture, short description). Menus that are empty at the source are skipped. Products are placed in the deepest menu they
// appear in (a sub menu, else the menu). Brand and filter tags (brand, type, watts, capacity, connector) are worked out from the product name. Re-running skips products already imported.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";
import { markupPct } from "./markup.js";

sharp.cache(false);
const args = process.argv.slice(2);
const file = args[0]; if (!file) throw new Error("usage: import-rcm.ts <rcm-full.json> [--photos dir] [--publish]");
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : undefined);
const publish = args.includes("--publish");
const here = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS = path.resolve(opt("photos") ?? path.join(here, "../../web-mobiles/public/cs"));
fs.mkdirSync(PHOTOS, { recursive: true });
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/mobiles/.test(db)) throw new Error(`refusing to run on database "${db}" (this import is for the mobiles shop)`);
const UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import)";
const SRC = "rcm-multimedia";

type P = { url: string; name: string; price: number; img?: string; des?: string; cats: { cat: string; sub: string | null }[] };
const data = JSON.parse(fs.readFileSync(file, "utf8")) as { catTitles: Record<string, string>; subTitles: Record<string, string>; cats: string[]; subs: string[]; products: P[] };

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const W1252 = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const clean1252 = (s: string) => Array.from(s).filter((ch) => { const c = ch.codePointAt(0)!; return c < 0x100 || W1252.has(ch); }).join("").replace(/[ \t]{2,}/g, " ").trim();
const title = (s: string) => clean1252(s.replace(/\s+/g, " ")).slice(0, 200);
const used = new Set<string>((await pool.query("SELECT slug FROM categories")).rows.map((r) => r.slug as string));
const uniq = (set: Set<string>, s: string) => { let v = s, n = 2; while (set.has(v)) v = `${s}-${n++}`; set.add(v); return v; };

// ---- menus: only menus that hold products
const sub2cat = (s: string) => s.split("/")[0];
const hasProducts = new Set<string>();
for (const p of data.products) for (const c of p.cats) { hasProducts.add(c.cat); if (c.sub) hasProducts.add(c.sub); }
const catId = new Map<string, string>();      // key: "cat" or "cat/sub"
let order = 0;
for (const c of data.cats.filter((c) => hasProducts.has(c))) {
  const name = data.catTitles[c] ?? c.replace(/-/g, " ");
  const ex = (await pool.query("SELECT id FROM categories WHERE parent_id IS NULL AND lower(name)=lower($1)", [name])).rows[0]?.id as string | undefined;
  catId.set(c, ex ?? (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,NULL,$3,$4) RETURNING id", [name, uniq(used, slugify(name)), ++order, publish])).rows[0].id as string);
}
for (const s of data.subs.filter((s) => hasProducts.has(s))) {
  const parent = catId.get(sub2cat(s)); if (!parent) continue;
  const name = data.subTitles[s] ?? s.split("/")[1].replace(/-/g, " ");
  const ex = (await pool.query("SELECT id FROM categories WHERE parent_id=$1 AND lower(name)=lower($2)", [parent, name])).rows[0]?.id as string | undefined;
  const n = Number((await pool.query("SELECT coalesce(max(sort_order),0)+1 n FROM categories WHERE parent_id=$1", [parent])).rows[0].n);
  catId.set(s, ex ?? (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id", [name, uniq(used, slugify(name)), parent, n, publish])).rows[0].id as string);
}
console.log(`menus ready: ${[...catId.keys()].filter((k) => !k.includes("/")).length} menus, ${[...catId.keys()].filter((k) => k.includes("/")).length} sub menus`);

// ---- brands and filter tags from the name
const BRANDS = ["Samsung", "Apple", "iPhone", "Infinix", "Xiaomi", "Redmi", "Oppo", "Vivo", "Realme", "Tecno", "Huawei", "OnePlus", "One+", "Nokia", "Itel", "Google", "Pixel", "JBL", "Sony", "Anker", "Baseus", "Joyroom", "Aspor", "LDNIO", "Ugreen", "Remax", "Faster", "Hoco", "Hippo", "Audionic", "Boya", "Mighty", "Champion", "Tucci", "Foxconn", "Mix", "Noosy", "Lenovo", "Haylou", "QCY", "Awei", "Havit", "Fantech", "Redragon", "HP", "Dell", "Logitech", "TP-Link", "Tenda", "Mi", "Techno Edge"];
const brandOf = (n: string) => BRANDS.find((b) => new RegExp(`(^|[^a-z])${b.replace(/[+]/g, "\\+")}([^a-z]|$)`, "i").test(n));
const tagsOf = (n: string, cats: string[]) => {
  const t = new Set<string>();
  const add = (x: string) => t.add(x);
  const rules: [RegExp, string][] = [[/charger|adapter|adaptor|adopter/i, "charger"], [/cable|wire/i, "cable"], [/air ?pods?|earbud|tws|buds/i, "earbuds"], [/hands ?free|handset|earphone/i, "handsfree"], [/headphone|headset/i, "headphones"], [/neck ?band/i, "neckband"],
    [/speaker|woofer/i, "speaker"], [/power ?bank/i, "power-bank"], [/smart ?watch|\bwatch\b/i, "watch"], [/type[- ]?c|usb[- ]?c/i, "type-c"], [/lightning|iphone/i, "lightning"], [/micro ?usb|v8/i, "micro-usb"], [/wireless|bluetooth|\bbt\b/i, "wireless"],
    [/\bpd\b|power delivery/i, "pd"], [/fast|super ?fast|quick/i, "fast-charging"], [/gaming|pubg|trigger|controller/i, "gaming"], [/\bled\b|torch|light/i, "lighting"], [/tripod|stand|holder/i, "stands"], [/memory|\bsd\b/i, "storage"], [/keyboard|mouse/i, "computer"], [/hdmi|lan|vga|usb ?hub/i, "connectors"], [/original/i, "original"]];
  for (const [re, tag] of rules) if (re.test(n)) add(tag);
  for (const m of n.matchAll(/(\d{2,3})\s?w\b/gi)) add(`${m[1]}w`);
  for (const m of n.matchAll(/(\d{4,5})\s?mah/gi)) add(`${m[1]}mah`);
  for (const c of cats) add(slugify(c));
  return [...t].slice(0, 12);
};
const brandId = new Map<string, string>();
const getBrand = async (name: string) => {
  const k = name.toLowerCase(); if (brandId.has(k)) return brandId.get(k)!;
  const ex = (await pool.query("SELECT id FROM brands WHERE lower(name)=lower($1)", [name])).rows[0]?.id as string | undefined;
  const id = ex ?? (await pool.query("INSERT INTO brands (name, slug) VALUES ($1,$2) RETURNING id", [name, uniq(new Set<string>((await pool.query("SELECT slug FROM brands")).rows.map((r) => r.slug as string)), slugify(name))])).rows[0].id as string;
  brandId.set(k, id); return id;
};

// ---- products
const done = new Set<string>((await pool.query("SELECT metafields->>'srcUrl' s FROM products WHERE metafields->>'source'=$1", [SRC])).rows.map((r) => r.s as string));
const taken = new Set<string>((await pool.query("SELECT slug FROM products")).rows.map((r) => r.slug as string));
const skus = new Set<string>((await pool.query("SELECT sku FROM products")).rows.map((r) => r.sku as string));
const best = new Map<string, string>();       // category key -> product image file of its first product (for the menu pictures)
async function photo(p: P, slug: string): Promise<string | null> {
  try { return await photoInner(p, slug); } catch (e) { console.log(`  photo failed for ${slug}: ${(e as Error).message}`); return null; }
}
async function photoInner(p: P, slug: string): Promise<string | null> {
  if (!p.img) return null;
  let buf: Buffer | null = null;
  for (let t = 0; t < 3 && !buf; t++) { try { const r = await fetch(encodeURI(p.img), { headers: { "user-agent": UA }, signal: AbortSignal.timeout(40000) }); if (r.ok) buf = Buffer.from(await r.arrayBuffer()); else if (r.status < 429) break; } catch { /* retry */ } if (!buf) await new Promise((r) => setTimeout(r, 1200 * (t + 1))); }
  if (!buf) return null;
  const flat = sharp(buf).rotate().flatten({ background: "#ffffff" });
  const trimmed = await flat.clone().trim({ threshold: 14 }).toBuffer({ resolveWithObject: true });
  const m = await flat.clone().metadata(); const ok = trimmed.info.width >= (m.width ?? 0) * 0.15 && trimmed.info.height >= (m.height ?? 0) * 0.15;
  const fit = await sharp(ok ? trimmed.data : await flat.toBuffer()).resize({ width: 810, height: 810, fit: "inside" }).toBuffer();
  const f = `m-${slug}.webp`;
  await sharp({ create: { width: 900, height: 900, channels: 4, background: "#ffffff" } }).composite([{ input: fit, gravity: "centre" }]).webp({ quality: 80 }).toFile(path.join(PHOTOS, f));
  return `/cs/${f}`;
}
let n = 0, photos = 0, skipped = 0;
const queue = data.products.filter((p) => !done.has(p.url) && p.price > 0);
let qi = 0;
async function one(p: P) {
  const keys = [...new Set(p.cats.map((c) => (c.sub && catId.has(c.sub) ? c.sub : catId.has(c.cat) ? c.cat : null)).filter(Boolean) as string[])];
  // a product listed in both a menu and one of its sub menus belongs to the sub menu only
  const leafKeys = keys.filter((k) => !keys.some((o) => o !== k && o.startsWith(k + "/")));
  if (!leafKeys.length) { skipped++; return; }
  const t = title(p.name); const slug = uniq(taken, slugify(t).slice(0, 110) || "product");
  const img = await photo(p, slug); if (img) photos++;
  const base = Math.round(p.price), pct = markupPct(base), sell = Math.round(base * (1 + pct / 100));
  let desc = clean1252((p.des ?? "").replace(/\s+/g, " ")); if (desc.length < 40) desc = `${t}. Buy ${t} online in Pakistan at AVERIXA Mobiles with cash on delivery and delivery across Pakistan.`;
  const brand = brandOf(t), tags = tagsOf(t, leafKeys.map((k) => data.subTitles[k] ?? data.catTitles[k] ?? k));
  const seoTitle = (t.length + 20 <= 62 ? `${t} Price in Pakistan` : t).slice(0, 62);
  const seoDescription = `Buy ${t} online in Pakistan for Rs. ${sell.toLocaleString("en-US")}. ${brand ? `${brand} ` : ""}mobile accessory with cash on delivery and delivery across Pakistan.`.slice(0, 158);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const pid = (await c.query(
      `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, brand_id, stock_quantity, moq, images, tags, metafields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,9999,1,$9,$10,$11) RETURNING id`,
      [t, slug, uniq(skus, `RCM-${slug.slice(0, 40)}`), desc.slice(0, 4000), publish ? "PUBLISHED" : "DRAFT", sell, sell, brand ? await getBrand(brand) : null, JSON.stringify(img ? [img] : []), tags,
       JSON.stringify({ source: SRC, srcUrl: p.url, markupApplied: true, markupPct: pct, priceBeforeMarkup: base, seoTitle, seoDescription })])).rows[0].id as string;
    for (const k of leafKeys) { await c.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2)", [pid, catId.get(k)]); if (img && !best.has(k)) best.set(k, img); }
    await c.query("COMMIT"); n++;
  } catch (e) { await c.query("ROLLBACK"); console.log(`  skipped ${slug}: ${(e as Error).message}`); } finally { c.release(); }
}
await Promise.all(Array.from({ length: 6 }, async () => { while (qi < queue.length) { const p = queue[qi++]; await one(p).catch((e) => console.log(`  ${p.name}: ${(e as Error).message}`)); } }));
console.log(`products: ${n} imported (${photos} photos), ${skipped} without a menu`);

// ---- menu pictures: a flagship product on a light tile (parents use the first picture of their sub menus or of their own products)
const tile = async (src: string) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5f6f9"/><stop offset="1" stop-color="#e4e7ee"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/></svg>`))
  .composite([{ input: await sharp(fs.readFileSync(path.join(PHOTOS, path.basename(src)))).trim({ threshold: 14 }).resize({ width: 440, height: 440, fit: "inside" }).png().toBuffer(), gravity: "centre", blend: "multiply" }]).webp({ quality: 86 }).toBuffer();
const pics = new Map<string, string>(best);
for (const [k] of catId) if (!pics.has(k)) { const kid = [...best.keys()].find((b) => b.startsWith(k + "/")); if (kid) pics.set(k, best.get(kid)!); }
let mp = 0;
for (const [k, src] of pics) { const id = catId.get(k)!; const f = `mc-${slugify(k)}.webp`; fs.writeFileSync(path.join(PHOTOS, f), await tile(src)); await pool.query("UPDATE categories SET image_url=$2 WHERE id=$1", [id, `/cs/${f}`]); mp++; }
console.log(`menu pictures: ${mp}`);
await delPattern("catalog:*").catch(() => {}); await delPattern("categories:*").catch(() => {});
await pool.end();
process.exit(0);
