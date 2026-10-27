// Imports ONE product of a partner Shopify store into a menu collection (created if missing), with the shop's sliding mark-up and its photos.
//   npx tsx scripts/import-product.ts <product-url> "<collection name>" [--parent <category-slug>] [--skip 7,8] [--publish]
// --parent puts the collection under that menu item (default: top level). --skip lists photo numbers (1-based) to leave out. Without --publish the product is saved as DRAFT and a new collection stays hidden.
// Photos are downloaded, shrunk to WebP (max 900 px) into apps/web/public/cs/ (not committed to git). Re-running skips a product already imported.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";
import { markupPct } from "./markup.js";

const UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import)";
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../../web/public/cs");
const args = process.argv.slice(2);
const [url, collection] = args;
if (!url || !collection) throw new Error('usage: import-product.ts <product-url> "<collection name>" [--skip 7,8] [--publish]');
const publish = args.includes("--publish");
const parentSlug = args.includes("--parent") ? args[args.indexOf("--parent") + 1] : null;
const skip = new Set((args[args.indexOf("--skip") + 1] ?? "").split(",").map(Number).filter(Boolean).filter(() => args.includes("--skip")));
const STOCK = 9999;     // real stock unknown; the shop's stock rule (admin, Settings, Stock) decides what shoppers see anyway

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'");
const strip = (h: string) => decode(h.replace(/<(br|\/p|\/li|\/div|\/h\d)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const W1252 = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");    // the database text encoding is Windows-1252
const clean1252 = (s: string) => Array.from(s).filter((ch) => { const c = ch.codePointAt(0)!; return c < 0x100 || W1252.has(ch); }).join("").replace(/[ \t]{2,}/g, " ").trim();

type P = { id: number; title: string; handle: string; body_html: string; product_type: string; tags: string[] | string; options: { name: string }[];
  variants: { id: number; title: string; sku: string | null; price: string; compare_at_price: string | null; available: boolean; option1: string | null; option2: string | null; option3: string | null }[];
  images: { src: string }[] };
const u0 = new URL(url);
const r0 = await fetch(`${u0.origin}${u0.pathname.replace(/\/$/, "")}.json`, { headers: { "user-agent": UA } });
if (!r0.ok) throw new Error(`product feed answered ${r0.status}`);
const p = (await r0.json() as { product: P }).product;

if ((await pool.query("SELECT 1 FROM products WHERE metafields->>'srcId'=$1 AND metafields->>'source'='partner-product'", [String(p.id)])).rowCount) { console.log("already imported"); process.exit(0); }

// collection (a menu item, or a sub collection of --parent)
const parentId = parentSlug ? ((await pool.query("SELECT id FROM categories WHERE slug=$1", [parentSlug])).rows[0]?.id as string | undefined) ?? (() => { throw new Error(`no collection with slug ${parentSlug}`); })() : null;
let cat = (await pool.query("SELECT id FROM categories WHERE parent_id IS NOT DISTINCT FROM $2 AND lower(name)=lower($1)", [collection, parentId])).rows[0]?.id as string | undefined;
if (!cat) {
  const used = new Set<string>((await pool.query("SELECT slug FROM categories")).rows.map((r) => r.slug as string));
  let slug = slugify(collection), k = 2; while (used.has(slug)) slug = `${slugify(collection)}-${k++}`;
  const sort = Number((await pool.query("SELECT coalesce(max(sort_order),0)+1 n FROM categories WHERE parent_id IS NOT DISTINCT FROM $1", [parentId])).rows[0].n);
  cat = (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id", [collection, slug, parentId, sort, publish])).rows[0].id;
  console.log(`collection created: ${collection}`);
} else if (publish) await pool.query("UPDATE categories SET is_active=TRUE WHERE id=$1", [cat]);

const slugBase = slugify(decode(p.title)).slice(0, 115);
const taken = new Set<string>((await pool.query("SELECT slug FROM products")).rows.map((r) => r.slug as string));
let slug = slugBase, k = 2; while (taken.has(slug)) slug = `${slugBase}-${k++}`;

fs.mkdirSync(OUT, { recursive: true });
const images: string[] = [];
for (let i = 0; i < p.images.length; i++) {
  if (skip.has(i + 1)) continue;
  const f = `${slug}-${i + 1}.webp`;
  const src = new URL(p.images[i].src); src.searchParams.set("width", "1000");
  let buf: Buffer | null = null;
  for (let t = 0; t < 4 && !buf; t++) {
    try { const r = await fetch(src, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(40000) }); if (r.ok) buf = Buffer.from(await r.arrayBuffer()); else if (r.status < 429) break; } catch { /* retry */ }
    if (!buf) await new Promise((res) => setTimeout(res, 1500 * (t + 1)));
  }
  if (!buf) { console.log(`  photo ${i + 1} failed`); continue; }
  await sharp(buf).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join(OUT, f));
  images.push(`/cs/${f}`);
}

const v0 = p.variants[0];
const title = clean1252(decode(p.title)).slice(0, 200);
const base = Math.round(Number(v0.price) || 0), pct = markupPct(base);
const up = (n: number) => Math.round(n * (1 + pct / 100));
const sell = up(base), cmp = up(Math.round(Number(v0.compare_at_price) || 0)), marked = cmp > sell ? cmp : sell;
let desc = clean1252(strip(p.body_html ?? ""));
if (desc.length < 40) desc = `${title}. Buy ${title} online in Pakistan at AVERIXA with cash on delivery and delivery across Pakistan.`;
const multi = p.variants.length > 1 || (p.options[0] && p.options[0].name !== "Title");
const stock = p.variants.reduce((s, v) => s + (v.available ? STOCK : 0), 0);
const taken2 = new Set<string>([...(await pool.query("SELECT sku FROM products")).rows, ...(await pool.query("SELECT sku FROM product_variants")).rows].map((r) => r.sku as string));
const sku = (s: string) => { let v = s, n = 2; while (taken2.has(v)) v = `${s}-${n++}`; taken2.add(v); return v; };

const c = await pool.connect();
try {
  await c.query("BEGIN");
  const pid = (await c.query(
    `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, brand_id, stock_quantity, moq, images, tags, metafields)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8,1,$9,$10,$11) RETURNING id`,
    [title, slug, sku(v0.sku || `PP-${p.id}`), desc.slice(0, 4000), publish ? "PUBLISHED" : "DRAFT", marked, sell, stock, JSON.stringify(images),
     [...new Set((Array.isArray(p.tags) ? p.tags : String(p.tags ?? "").split(",")).map((t) => slugify(t.trim())).filter(Boolean))].slice(0, 8),
     JSON.stringify({ source: "partner-product", srcId: String(p.id), markupApplied: true, markupPct: pct, priceBeforeMarkup: base })])).rows[0].id as string;
  if (multi) for (const v of p.variants) {
    const attrs: Record<string, string> = {};
    p.options.forEach((o, i) => { const val = [v.option1, v.option2, v.option3][i]; if (val && o.name !== "Title") attrs[clean1252(o.name).toLowerCase()] = clean1252(val); });
    const vp = Math.round(Number(v.price) || 0);
    await c.query("INSERT INTO product_variants (product_id, title, sku, price, stock_quantity, variant_attributes) VALUES ($1,$2,$3,$4,$5,$6)",
      [pid, clean1252(v.title).slice(0, 200), sku(v.sku || `PP-${v.id}`), vp ? Math.round(vp * (1 + markupPct(vp) / 100)) : sell, v.available ? STOCK : 0, JSON.stringify(attrs)]);
  }
  await c.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2)", [pid, cat]);
  await c.query("COMMIT");
  console.log(`imported "${title}" slug=${slug} photos=${images.length} price ${base} -> ${sell} (+${pct}%) marked ${marked} status=${publish ? "PUBLISHED" : "DRAFT"}`);
} catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
await delPattern("catalog:*").catch(() => {});
await pool.end();
process.exit(0);
