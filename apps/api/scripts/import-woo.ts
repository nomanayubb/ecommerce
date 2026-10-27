// Imports all products of a partner WooCommerce store (public Store API) into a sub collection of ALL ORGANIC, with the shop's sliding mark-up.
//   npx tsx scripts/import-woo.ts <store-url> "<sub collection name>" [--publish]
// Photos are downloaded, shrunk to WebP (max 900 px) into apps/web/public/cs/ (not in git). Without --publish the products are DRAFT and the collection hidden.
// Only simple products are handled (the partner's store has no variations); the store's own categories are not copied. Re-running skips products already imported.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";
import { markupPct } from "./markup.js";

const POS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (POS.length < 2) throw new Error('usage: import-woo.ts <store-url> "<sub collection name>" [--publish]');
const BASE = POS[0].replace(/\/+$/, ""), ROOT = POS[1], publish = process.argv.includes("--publish");
const SRC = "woo-" + ROOT.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import)";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/public/cs");
fs.mkdirSync(OUT, { recursive: true });
const STOCK = 9999;       // real stock unknown; the stock rule (admin, Settings, Stock) decides what shoppers see

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;|&#038;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;|&#8221;|&#8220;/g, '"').replace(/&#39;|&#8217;|&rsquo;|&lsquo;/g, "'");
const strip = (h: string) => decode(h.replace(/<(br|\/p|\/li|\/div|\/h\d)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const W1252 = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");    // the database text encoding is Windows-1252
const clean1252 = (s: string) => Array.from(s).filter((ch) => { const c = ch.codePointAt(0)!; return c < 0x100 || W1252.has(ch); }).join("").replace(/[ \t]{2,}/g, " ").trim();

type W = { id: number; name: string; slug: string; sku: string; description: string; short_description: string; is_in_stock: boolean; images: { src: string }[];
  prices: { price: string; regular_price: string; sale_price: string; currency_minor_unit: number } };
const res = await fetch(`${BASE}/index.php?rest_route=/wc/store/v1/products&per_page=100`, { headers: { "user-agent": UA } });
if (!res.ok) throw new Error(`product feed answered ${res.status}`);
const items = (await res.json()) as W[];
console.log(`products in the feed: ${items.length}`);

// sub collection under ALL ORGANIC
const parent = (await pool.query("SELECT id FROM categories WHERE slug='all-organic'")).rows[0]?.id as string | undefined;
if (!parent) throw new Error("the ALL ORGANIC collection does not exist");
let cat = (await pool.query("SELECT id FROM categories WHERE parent_id=$1 AND lower(name)=lower($2)", [parent, ROOT])).rows[0]?.id as string | undefined;
if (!cat) {
  const used = new Set<string>((await pool.query("SELECT slug FROM categories")).rows.map((r) => r.slug as string));
  let slug = slugify(ROOT), k = 2; while (used.has(slug)) slug = `${slugify(ROOT)}-${k++}`;
  const sort = Number((await pool.query("SELECT coalesce(max(sort_order),0)+1 n FROM categories WHERE parent_id=$1", [parent])).rows[0].n);
  cat = (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id", [ROOT, slug, parent, sort, publish])).rows[0].id as string;
  console.log(`collection created: ${ROOT}`);
} else if (publish) await pool.query("UPDATE categories SET is_active=TRUE WHERE id=$1", [cat]);

const done = new Set<string>((await pool.query("SELECT metafields->>'srcId' s FROM products WHERE metafields->>'source'=$1", [SRC])).rows.map((r) => r.s as string));
const taken = new Set<string>((await pool.query("SELECT slug FROM products")).rows.map((r) => r.slug as string));
const skus = new Set<string>([...(await pool.query("SELECT sku FROM products")).rows, ...(await pool.query("SELECT sku FROM product_variants")).rows].map((r) => r.sku as string));
const uniq = (set: Set<string>, s: string) => { let v = s, n = 2; while (set.has(v)) v = `${s}-${n++}`; set.add(v); return v; };

let n = 0, photos = 0;
for (const p of items) {
  if (done.has(String(p.id))) continue;
  const slug = uniq(taken, slugify(decode(p.name)).slice(0, 115));
  const images: string[] = [];
  for (let i = 0; i < p.images.length; i++) {
    let buf: Buffer | null = null;
    for (let t = 0; t < 4 && !buf; t++) {
      try { const r = await fetch(p.images[i].src, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(40000) }); if (r.ok) buf = Buffer.from(await r.arrayBuffer()); else if (r.status < 429) break; } catch { /* retry */ }
      if (!buf) await new Promise((res) => setTimeout(res, 1500 * (t + 1)));
    }
    if (!buf) { console.log(`  ${slug}: photo ${i + 1} failed`); continue; }
    const f = `${slug}-${i + 1}.webp`;
    await sharp(buf).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join(OUT, f));
    images.push(`/cs/${f}`); photos++;
  }
  const div = 10 ** p.prices.currency_minor_unit;
  const base = Math.round(Number(p.prices.sale_price || p.prices.price) / div), reg = Math.round(Number(p.prices.regular_price || p.prices.price) / div);
  const pct = markupPct(base), up = (x: number) => Math.round(x * (1 + pct / 100));
  const sell = up(base), marked = Math.max(up(reg), sell);
  const title = clean1252(decode(p.name)).slice(0, 200);
  let desc = clean1252(strip(p.description || p.short_description || ""));
  if (desc.length < 40) desc = `${title}. Buy ${title} online in Pakistan at AVERIXA with cash on delivery and delivery across Pakistan.`;
  const tags = /shampoo/i.test(title) ? ["shampoo", "hair-care"] : /cube|soap|cream|serum|gel/i.test(title) ? ["skin-care"] : [];
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const pid = (await c.query(
      `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, brand_id, stock_quantity, moq, images, tags, metafields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8,1,$9,$10,$11) RETURNING id`,
      [title, slug, uniq(skus, p.sku || `WC-${p.id}`), desc.slice(0, 4000), publish ? "PUBLISHED" : "DRAFT", marked, sell, p.is_in_stock ? STOCK : 0, JSON.stringify(images), tags,
       JSON.stringify({ source: SRC, srcId: String(p.id), markupApplied: true, markupPct: pct, priceBeforeMarkup: base })])).rows[0].id as string;
    await c.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2)", [pid, cat]);
    await c.query("COMMIT"); n++;
    console.log(`  ${title}: ${base} -> ${sell} (+${pct}%) marked ${marked}, photos ${images.length}`);
  } catch (e) { await c.query("ROLLBACK"); console.log(`  skipped ${slug}: ${(e as Error).message}`); } finally { c.release(); }
}
await delPattern("catalog:*").catch(() => {});
console.log(`finished: ${n} products, ${photos} photos, status ${publish ? "PUBLISHED" : "DRAFT"}`);
await pool.end();
process.exit(0);
