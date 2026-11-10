// Imports the owner's own Shopify catalogue (barkatbooks.com, product export CSV) into the BOOKS shop (DATABASE_URL = shop_books; refuses any other database).
//   DATABASE_URL=postgres://.../shop_books REDIS_URL=redis://.../5 npx tsx scripts/import-books.ts [--csv data/books/products.csv] [--images 4] [--workers 6] [--limit N] [--no-photos]
// Prices are copied exactly (Variant Price = selling price, Compare At Price = the struck-through marked price). Menus = the collections of the Shopify store, built as the category tree below
// (slugs = the Shopify collection handles, so old links keep their meaning); products join a collection through the same tags the Shopify smart collections use.
// Photos: first N gallery pictures from cdn.shopify.com, 4:5 webp with the cover fully visible (padded, transparent), saved in apps/web-books/public/bk (git-ignored). Safe to re-run: products are matched by slug.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";

sharp.cache(false);
const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : undefined);
const here = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.resolve(opt("csv") ?? path.join(here, "../data/books/products.csv"));
const NIMG = Number(opt("images") ?? 4) || 4, WORKERS = Number(opt("workers") ?? 6) || 6, LIMIT = Number(opt("limit") ?? 0) || Infinity, PHOTOS_ON = !args.includes("--no-photos");
const PHOTOS = path.resolve(here, "../../web-books/public/bk");
fs.mkdirSync(PHOTOS, { recursive: true });
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/books/.test(db)) throw new Error(`refusing to run on database "${db}" (this import is for the books shop)`);
const UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import)";

// ---- the menu (as on barkatbooks.com): name, slug (= Shopify handle), children. Groups have no products of their own.
type Node = { name: string; slug: string; kids?: Node[] };
const TREE: Node[] = [
  { name: "New Books", slug: "sales" },
  { name: "Best Selling Books", slug: "best-selling-books", kids: [
    { name: "Summer Sale", slug: "sales-2" },
    { name: "Best Selling Author", slug: "best-selling-author", kids: [
      { name: "Colleen Hoover", slug: "colleen-hoover" }, { name: "Ana Huang", slug: "ana-huang" }, { name: "Paulo Coelho", slug: "elif-shafak" },
      { name: "Jennifer Lynn Barnes", slug: "jennifer-lynn-barnes" }, { name: "Wimpy Kid", slug: "wimpy-kid" } ] },
    { name: "Ramadan Deals", slug: "sale" },
    { name: "Best Selling Books", slug: "english" },
    { name: "Series", slug: "series", kids: [
      { name: "Harry Potter Series", slug: "harry-potter-series" }, { name: "Twisted (series)", slug: "wisted-series" }, { name: "Shatter Me", slug: "shatter-me" }, { name: "Rohald Dahl Series", slug: "rohald-dahl-series" } ] },
    { name: "IELTS", slug: "ielts" },
    { name: "Sale 75% off", slug: "sales-3" },
    { name: "Kids Collection", slug: "kids-collection", kids: [{ name: "Kids Books", slug: "childerss-books" }, { name: "Games", slug: "games" }] },
    { name: "Pack's Book", slug: "packs-book-1" }, { name: "Medical books", slug: "medical-book" }, { name: "Books On Startups", slug: "sales-1" }, { name: "Islamic Books", slug: "islamic-books" },
  ] },
  { name: "Urdu Books", slug: "urdu-books" },
  { name: "Original Books", slug: "sales-4" },
  { name: "Css", slug: "css" },
  { name: "Others", slug: "others", kids: [{ name: "Imported Products", slug: "other-imported-products" }] },
];
// membership: the tag each Shopify smart collection is built on (counts checked equal to the live collections) or, for the small hand-picked ones, the product handles
const BY_TAG: Record<string, string> = { sales: "new arrival", "sales-2": "clearance", "sales-3": "sale", "sales-4": "original", sale: "ramadan deals", english: "english", "urdu-books": "urdu", childerss: "kids", "childerss-books": "kids",
  css: "css", games: "game", "islamic-books": "islamic books", "colleen-hoover": "colleen hoover", "rohald-dahl-series": "rohald dahl", "packs-book-1": "pack", "wimpy-kid": "wimpy kid", "harry-potter-series": "harry potter series", "shatter-me": "shatter me" };
const BY_HANDLE: Record<string, string[]> = JSON.parse(fs.readFileSync(path.join(here, "../data/books/small.json"), "utf8"));

// ---- CSV (RFC 4180: quotes, doubled quotes, newlines inside fields)
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
    else if (c !== "\r") f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const raw = parseCsv(fs.readFileSync(CSV, "utf8").replace(/^﻿/, ""));
const head = raw[0], rows = raw.slice(1).filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
type Row = Record<string, string>;
const byHandle = new Map<string, Row[]>();
for (const r of rows) (byHandle.get(r["Handle"]) ?? byHandle.set(r["Handle"], []).get(r["Handle"])!).push(r);
console.log(`csv: ${rows.length} rows, ${byHandle.size} products`);

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };
const text = (html: string) => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n").replace(/<li[^>]*>/gi, "• ").replace(/<[^>]+>/g, "")
  .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => (e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? m))
  .replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
const money = (s: string) => { const n = Number(s); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

// ---- categories
const catId = new Map<string, string>();
let order = 0;
async function addNode(n: Node, parent: string | null) {
  const ex = (await pool.query("SELECT id FROM categories WHERE slug=$1", [n.slug])).rows[0]?.id as string | undefined;
  const id = ex ?? (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,$3,$4,true) RETURNING id", [n.name, n.slug, parent, ++order])).rows[0].id as string;
  if (ex) await pool.query("UPDATE categories SET name=$2, parent_id=$3, sort_order=$4, is_active=true WHERE id=$1", [id, n.name, parent, ++order]);
  catId.set(n.slug, id);
  for (const k of n.kids ?? []) await addNode(k, id);
}
for (const n of TREE) await addNode(n, null);
console.log(`categories: ${catId.size}`);

// ---- photos
async function photo(src: string, out: string): Promise<boolean> {
  const file = path.join(PHOTOS, out);
  if (fs.existsSync(file)) return true;
  const url = src + (src.includes("?") ? "&" : "?") + "width=1000";
  let buf: Buffer | null = null;
  for (let t = 0; t < 4 && !buf; t++) {
    try { const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60000) }); if (r.ok) buf = Buffer.from(await r.arrayBuffer()); else if (r.status !== 429 && r.status < 500) break; else await new Promise((s) => setTimeout(s, 2500 * (t + 1))); }
    catch { await new Promise((s) => setTimeout(s, 1500)); }
  }
  if (!buf) return false;
  try { await sharp(buf).rotate().resize({ width: 800, height: 1000, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 80, alphaQuality: 90 }).toFile(file); return true; } catch { return false; }
}

// ---- products
const taken = new Set<string>((await pool.query("SELECT slug FROM products")).rows.map((r) => r.slug as string));
const skus = new Set<string>((await pool.query("SELECT sku FROM products UNION SELECT sku FROM product_variants")).rows.map((r) => r.sku as string));
const uniqSku = (s: string) => { let v = s.slice(0, 90), n = 2; while (skus.has(v)) v = `${s.slice(0, 85)}-${n++}`; skus.add(v); return v; };
const handles = [...byHandle.keys()].slice(0, LIMIT);
let done = 0, added = 0, skipped = 0, photos = 0, noPhoto = 0, qi = 0;

async function one(handle: string, idx: number) {
  const rs = byHandle.get(handle)!, p = rs[0];
  if (taken.has(handle)) { skipped++; return; }
  const vrows = rs.filter((r) => r["Variant Price"] !== "");
  const price = money(vrows[0]?.["Variant Price"] ?? "0"), cmp = money(vrows[0]?.["Variant Compare At Price"] ?? "0");
  const marked = cmp > price ? cmp : price;
  const tracked = vrows[0]?.["Variant Inventory Tracker"] === "shopify";
  const stockOf = (r: Row) => (r["Variant Inventory Tracker"] === "shopify" ? Math.max(0, Number(r["Variant Inventory Qty"]) || 0) : 100);   // not tracked on Shopify = always orderable
  const srcImgs = rs.filter((r) => r["Image Src"]).sort((a, b) => Number(a["Image Position"] || 99) - Number(b["Image Position"] || 99)).map((r) => r["Image Src"]).filter((u, i, a) => a.indexOf(u) === i).slice(0, NIMG);
  const imgs: string[] = [];
  if (PHOTOS_ON) for (let i = 0; i < srcImgs.length; i++) { const f = `bk-${idx + 1}-${i + 1}.webp`; if (await photo(srcImgs[i], f)) { imgs.push(`/bk/${f}`); photos++; } }
  if (!imgs.length) noPhoto++;
  const tags = [...new Set(p["Tags"].split(",").map((t) => slugify(t)).filter(Boolean))];
  const cats = new Set<string>();
  for (const [slug, tag] of Object.entries(BY_TAG)) if (catId.has(slug) && p["Tags"].toLowerCase().split(",").map((t) => t.trim()).includes(tag)) cats.add(slug);
  for (const [slug, hs] of Object.entries(BY_HANDLE)) if (catId.has(slug) && hs.includes(handle)) cats.add(slug);
  const sku = uniqSku(vrows[0]?.["Variant SKU"] || `BK-${idx + 1}`);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const pid = (await c.query(
      `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, stock_quantity, moq, images, tags, metafields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10,$11) RETURNING id`,
      [p["Title"].slice(0, 250), handle.slice(0, 250), sku, text(p["Body (HTML)"]).slice(0, 8000), "PUBLISHED", marked, price, vrows.length > 1 ? 0 : stockOf(vrows[0] ?? p), JSON.stringify(imgs), tags,
       JSON.stringify({ source: "barkatbooks", srcHandle: handle, srcUrl: `https://barkatbooks.com/products/${handle}`, tracked })])).rows[0].id as string;
    if (vrows.length > 1) {
      const names = [p["Option1 Name"], p["Option2 Name"], p["Option3 Name"]];
      for (const v of vrows) {
        const vals = [v["Option1 Value"], v["Option2 Value"], v["Option3 Value"]].filter(Boolean);
        const attrs: Record<string, string> = {}; vals.forEach((x, i) => (attrs[(names[i] || `option${i + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "_")] = x));
        await c.query("INSERT INTO product_variants (product_id, title, sku, price, stock_quantity, variant_attributes, image_index) VALUES ($1,$2,$3,$4,$5,$6,0)",
          [pid, (vals.join(" / ") || "Default").slice(0, 250), uniqSku(v["Variant SKU"] || `${sku}-${vals.join("-")}`), money(v["Variant Price"]), stockOf(v), JSON.stringify(attrs)]);
      }
    }
    for (const s of cats) await c.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [pid, catId.get(s)]);
    await c.query("COMMIT"); taken.add(handle); added++;
  } catch (e) { await c.query("ROLLBACK"); console.log(`  skipped ${handle}: ${(e as Error).message}`); } finally { c.release(); }
}
await Promise.all(Array.from({ length: WORKERS }, async () => {
  while (qi < handles.length) { const i = qi++; await one(handles[i], i).catch((e) => console.log(`  ${handles[i]}: ${(e as Error).message}`)); if (++done % 100 === 0) console.log(`imported ${done}/${handles.length} (${photos} photos)`); }
}));
console.log(`finished: ${added} added, ${skipped} already there, ${photos} photos, ${noPhoto} products without a photo`);
await delPattern("catalog:*").catch(() => {}); await delPattern("categories:*").catch(() => {}); await delPattern("product:*").catch(() => {});
await pool.end();
process.exit(0);
