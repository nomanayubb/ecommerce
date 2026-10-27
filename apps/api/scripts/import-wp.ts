// Imports the product catalogue of a WordPress store whose products are a custom post type (REST route /wp/v2/product, taxonomies product_category and brand,
// price in the page's schema.org Product data) into the CURRENT database (set DATABASE_URL to pick the electronics database), with the shop's sliding mark-up.
//   DATABASE_URL=... npx tsx scripts/import-wp.ts <store-url> [--groups scripts/data/electronics-groups.json] [--limit N] [--workers N] [--publish]
// --groups: JSON {"Menu name": ["store category", ...]}; each menu becomes a top-level menu and its store categories its sub menus (products only go into the sub menus).
// Store categories not listed become top-level menus of their own. Photos: shrunk to WebP (max 900 px) into apps/web/public/cs/ (not in git). Re-running skips products already imported.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";
import { markupPct } from "./markup.js";

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : undefined);
const BASE = (args[0] ?? "").replace(/\/+$/, "");
if (!BASE.startsWith("http")) throw new Error("usage: import-wp.ts <store-url> [--groups file.json] [--limit N] [--publish]");
const publish = args.includes("--publish"), LIMIT = Number(opt("limit") ?? 0) || Infinity;
const SRC = "wp-" + new URL(BASE).hostname.replace(/[^a-z0-9]+/g, "-");
const UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import)";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/public/cs");
fs.mkdirSync(OUT, { recursive: true });
const STOCK = 9999;    // real stock unknown; the stock rule (admin, Settings, Stock) decides what shoppers see

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;|&#038;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;|&#8221;|&#8220;/g, '"').replace(/&#39;|&#8217;|&rsquo;|&lsquo;|&#8216;/g, "'").replace(/&#8211;|&ndash;/g, "-").replace(/&middot;/g, "·");
const strip = (h: string) => decode(h.replace(/<(br|\/p|\/li|\/div|\/h\d)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const W1252 = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");    // the database text encoding is Windows-1252
const clean1252 = (s: string) => Array.from(s).filter((ch) => { const c = ch.codePointAt(0)!; return c < 0x100 || W1252.has(ch); }).join("").replace(/[ \t]{2,}/g, " ").trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, tries = 4): Promise<Response> {
  for (let t = 0; ; t++) {
    try { const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(45000) }); if (r.ok || r.status < 429 || t >= tries) return r; } catch (e) { if (t >= tries) throw e; }
    await sleep(1500 * (t + 1));
  }
}
const json = async <T,>(url: string) => { const r = await get(url); if (!r.ok) throw new Error(`${url} answered ${r.status}`); return (await r.json()) as T; };
async function pages<T>(url: string): Promise<T[]> {
  const all: T[] = [];
  for (let p = 1; ; p++) { const r = await get(`${url}${url.includes("?") ? "&" : "?"}per_page=100&page=${p}`); if (!r.ok) break; const a = (await r.json()) as T[]; all.push(...a); if (a.length < 100) break; }
  return all;
}

type Term = { id: number; name: string; slug: string; parent: number };
type Item = { id: number; slug: string; link: string; title: { rendered: string }; product_category: number[]; brand: number[] };
const [cats, brandTerms, items] = await Promise.all([
  pages<Term>(`${BASE}/wp-json/wp/v2/product_category?_fields=id,name,slug,parent`),
  pages<Term>(`${BASE}/wp-json/wp/v2/brand?_fields=id,name,slug,parent`),
  pages<Item>(`${BASE}/wp-json/wp/v2/product?_fields=id,slug,link,title,product_category,brand`),
]);
console.log(`store: ${items.length} products, ${cats.length} categories, ${brandTerms.length} brands`);

// menus
const groups: Record<string, string[]> = opt("groups") ? JSON.parse(fs.readFileSync(opt("groups")!, "utf8")) : {};
const used = new Set<string>((await pool.query("SELECT slug FROM categories")).rows.map((r) => r.slug as string));
const uniq = (set: Set<string>, s: string) => { let v = s, n = 2; while (set.has(v)) v = `${s}-${n++}`; set.add(v); return v; };
async function menu(name: string, parent: string | null, sort: number): Promise<string> {
  const ex = (await pool.query("SELECT id FROM categories WHERE parent_id IS NOT DISTINCT FROM $1 AND lower(name)=lower($2)", [parent, name])).rows[0]?.id as string | undefined;
  if (ex) { if (publish) await pool.query("UPDATE categories SET is_active=TRUE WHERE id=$1", [ex]); return ex; }
  return (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id", [name, uniq(used, slugify(name)), parent, sort, publish])).rows[0].id as string;
}
const catMenu = new Map<number, string>();      // store category id -> sub menu id
let top = 0;
const listed = new Set<string>();
for (const [g, names] of Object.entries(groups)) {
  const gid = await menu(g, null, ++top); let s = 0;
  for (const n of names) { const c = cats.find((x) => x.name.toLowerCase() === n.toLowerCase()); if (!c) { console.log(`  group ${g}: store has no category "${n}"`); continue; } listed.add(c.name.toLowerCase()); catMenu.set(c.id, await menu(c.name.replace(/&amp;/g, "&"), gid, ++s)); }
}
for (const c of cats) if (!listed.has(c.name.toLowerCase())) catMenu.set(c.id, await menu(decode(c.name), null, ++top));
console.log(`menus ready: ${top} top-level, ${catMenu.size} sub menus`);

// brands
const brandId = new Map<number, string>();
for (const b of brandTerms) {
  const name = decode(b.name), ex = (await pool.query("SELECT id FROM brands WHERE lower(name)=lower($1)", [name])).rows[0]?.id as string | undefined;
  brandId.set(b.id, ex ?? (await pool.query("INSERT INTO brands (name, slug) VALUES ($1,$2) RETURNING id", [name, uniq(new Set<string>((await pool.query("SELECT slug FROM brands")).rows.map((r) => r.slug as string)), slugify(name))])).rows[0].id as string);
}

const done = new Set<string>((await pool.query("SELECT metafields->>'srcId' s FROM products WHERE metafields->>'source'=$1", [SRC])).rows.map((r) => r.s as string));
const taken = new Set<string>((await pool.query("SELECT slug FROM products")).rows.map((r) => r.slug as string));
const skus = new Set<string>([...(await pool.query("SELECT sku FROM products")).rows, ...(await pool.query("SELECT sku FROM product_variants")).rows].map((r) => r.sku as string));
const seen = new Set<string>((await pool.query("SELECT lower(title) t, sku FROM products WHERE metafields->>'source'=$1", [SRC])).rows.map((r) => `${r.t}|${String(r.sku).replace(/-\d+$/, "")}`));   // the store lists some products twice (slug suffix -2, -3): same title and SKU counts once

let n = 0, photos = 0, dup = 0, bad = 0;
const queue = items.filter((i) => !done.has(String(i.id))).slice(0, LIMIT);
async function one(it: Item) {
  const r = await get(it.link);
  if (!r.ok) { bad++; console.log(`  ${it.slug}: page answered ${r.status}`); return; }
  const html = await r.text();
  let ld: any = null;
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) { try { const j = JSON.parse(m[1]); if (j["@type"] === "Product") { ld = j; break; } } catch { /* next */ } }
  if (!ld) { bad++; console.log(`  ${it.slug}: no product data`); return; }
  const base = Math.round(Number(ld.offers?.price) || 0);
  if (!(base > 0)) { bad++; console.log(`  ${it.slug}: no price`); return; }
  const title = clean1252(decode(String(ld.name ?? strip(it.title.rendered)))).slice(0, 200);
  const key = `${title.toLowerCase()}|${ld.sku ?? ""}`;
  if (seen.has(key)) { dup++; return; }
  seen.add(key);
  const slug = uniq(taken, slugify(title).slice(0, 110));
  // Some products have no image in the schema data: the page then shows an "external featured image" (a picture hosted elsewhere) as the main photo.
  const imgUrl = (Array.isArray(ld.image) ? ld.image[0] : ld.image) || (/<img[^>]+src="(https?:[^"]+)"[^>]*class="[^"]*(?:external-featured-image|wp-post-image)[^"]*"/i.exec(html)?.[1] ?? /<img[^>]+class="[^"]*(?:external-featured-image|wp-post-image)[^"]*"[^>]+src="(https?:[^"]+)"/i.exec(html)?.[1])?.replace(/&amp;/g, "&");
  const images: string[] = [];
  if (imgUrl) {
    let buf: Buffer | null = null;
    for (let t = 0; t < 4 && !buf; t++) { try { const ir = await fetch(String(imgUrl), { headers: { "user-agent": UA }, signal: AbortSignal.timeout(40000) }); if (ir.ok) buf = Buffer.from(await ir.arrayBuffer()); else if (ir.status < 429) break; } catch { /* retry */ } if (!buf) await sleep(1500 * (t + 1)); }
    if (buf) { const f = `e-${slug}.webp`; await sharp(buf).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join(OUT, f)); images.push(`/cs/${f}`); photos++; } else console.log(`  ${slug}: photo failed`);
  }
  const body = /<div class="me-product-description"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "";
  let desc = clean1252(strip(body.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, "")));
  if (desc.length < 40) desc = clean1252(strip(String(ld.description ?? "")));
  if (desc.length < 40) desc = `${title}. Buy ${title} online in Pakistan at AVERIXA with cash on delivery and delivery across Pakistan.`;
  const model = /Model:\s*([^&<·]+?)\s*(?:&middot;|·|<)/.exec(html)?.[1]?.trim();
  if (model && !desc.includes(model)) desc += `\n\nModel: ${model}`;
  const pct = markupPct(base), sell = Math.round(base * (1 + pct / 100));
  const inStock = !/OutOfStock/i.test(String(ld.offers?.availability ?? ""));
  const brand = it.brand.map((b) => brandId.get(b)).find(Boolean) ?? null;
  const tags = [...new Set([...it.brand.map((b) => brandTerms.find((x) => x.id === b)?.slug), ...it.product_category.map((c) => cats.find((x) => x.id === c)?.slug)].filter(Boolean) as string[])].slice(0, 8);
  // Search engine title and description for every product (the product page reads metafields seoTitle / seoDescription).
  const brandName = it.brand.map((b) => brandTerms.find((x) => x.id === b)?.name).find(Boolean);
  const cutAt = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max).replace(/\s+\S*$/, "").trim());
  const seoTitle = cutAt(title.length + 20 <= 62 ? `${title} Price in Pakistan` : title, 62);
  const catName = it.product_category.map((c) => cats.find((x) => x.id === c)?.name).find(Boolean);
  const seoDescription = cutAt(`Buy ${title} online in Pakistan for Rs. ${sell.toLocaleString("en-US")}. ${brandName ? `Original ${decode(brandName)} ` : "Original "}${catName ? decode(catName).toLowerCase() : "product"} with warranty, cash on delivery and delivery across Pakistan.`, 158);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const pid = (await c.query(
      `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, brand_id, stock_quantity, moq, images, tags, metafields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,$11,$12) RETURNING id`,
      [title, slug, uniq(skus, String(ld.sku || `WP-${it.id}`)), desc.slice(0, 4000), publish ? "PUBLISHED" : "DRAFT", sell, sell, brand, inStock ? STOCK : 0, JSON.stringify(images), tags,
       JSON.stringify({ source: SRC, srcId: String(it.id), markupApplied: true, markupPct: pct, priceBeforeMarkup: base, seoTitle, seoDescription })])).rows[0].id as string;
    for (const cid of new Set(it.product_category.map((x) => catMenu.get(x)).filter(Boolean) as string[])) await c.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2)", [pid, cid]);
    await c.query("COMMIT"); n++;
  } catch (e) { await c.query("ROLLBACK"); bad++; console.log(`  skipped ${slug}: ${(e as Error).message}`); } finally { c.release(); }
}
let next = 0;
await Promise.all(Array.from({ length: Number(opt("workers") ?? 4) || 4 }, async () => { while (next < queue.length) { const it = queue[next++]; await one(it).catch((e) => { bad++; console.log(`  ${it.slug}: ${(e as Error).message}`); }); if (next % 100 === 0) console.log(`imported ${n}/${queue.length}  photos ${photos}`); await sleep(150); } }));
await delPattern("catalog:*").catch(() => {});
console.log(`finished: ${n} products, ${photos} photos, ${dup} repeated listings skipped, ${bad} problems, status ${publish ? "PUBLISHED" : "DRAFT"}`);
await pool.end();
process.exit(0);
