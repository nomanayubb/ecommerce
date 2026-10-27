// Imports a whole partner Shopify store (its collections as sub collections, all products, all photos, product types as filter tags) under ALL ORGANIC.
//   npx tsx scripts/import-store.ts <store-url> "<sub collection name>"            products saved as DRAFT, collections hidden
//   npx tsx scripts/import-store.ts <store-url> "<sub collection name>" --publish  publishes that store's products and shows its collections
// Prices get the shop's sliding mark-up (scripts/markup.ts), photos are shrunk to WebP (max 900 px) into apps/web/public/cs/ (not in git). Resumable.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";
import { markupPct } from "./markup.js";

const POS = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !(i > 0 && all[i - 1] === "--limit"));
if (POS.length < 2) throw new Error('usage: import-store.ts <store-url> "<sub collection name>" [--publish] [--limit N]');
const BASE = POS[0].replace(/\/+$/, "");
const ROOT = POS[1];            // the store's name is a sub collection of the ALL ORGANIC menu
const SRC = "store-" + POS[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import)";
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../../web/public/cs");
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };

// No real stock figures are known, so an available item gets a large number (a small one would stop shoppers ordering more than that); sold-out items stay at 0.
const STOCK = 9999;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'");
const strip = (h: string) => decode(h.replace(/<(br|\/p|\/li|\/div|\/h\d)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
// The database text encoding is Windows-1252: emoji and other symbols it cannot store are dropped.
const W1252 = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const clean1252 = (s: string) => Array.from(s).filter((ch) => { const c = ch.codePointAt(0)!; return c < 0x100 || W1252.has(ch); }).join("").replace(/[ \t]{2,}/g, " ").trim();
const noQM = (s: string) => s.replace(/®/g, "").replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim();
const titleCase = (t: string) => t.replace(/\b([a-z])([a-z]*)/g, (_m, a: string, b: string) => a.toUpperCase() + b);

async function getJson<T>(url: string): Promise<T | null> {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(30000) });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (i + 1)); continue; }
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch { await sleep(1500 * (i + 1)); }
  }
  return null;
}
async function pool_<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: size }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

// ---- publish mode: make the imported products and collections visible
if (flag("publish")) {
  const p = await pool.query("UPDATE products SET status='PUBLISHED' WHERE metafields->>'source'=$1 AND status='DRAFT'", [SRC]);
  const c = await pool.query("WITH RECURSIVE t AS (SELECT id FROM categories WHERE name=$1 AND parent_id=(SELECT id FROM categories WHERE slug='all-organic') UNION ALL SELECT c.id FROM categories c JOIN t ON c.parent_id = t.id) UPDATE categories SET is_active=TRUE WHERE id IN (SELECT id FROM t)", [ROOT]);
  await delPattern("catalog:*").catch(() => {});
  console.log(`published ${p.rowCount} products, collections shown ${c.rowCount}`);
  await pool.end(); process.exit(0);
}

type KVariant = { id: number; title: string; sku: string; price: string; compare_at_price: string | null; available: boolean; option1: string | null; option2: string | null; option3: string | null; featured_image?: { position: number } | null };
type KProduct = { id: number; title: string; handle: string; body_html: string | null; vendor: string; product_type: string; tags: string[]; variants: KVariant[]; images: { src: string; position: number }[]; options: { name: string }[] };

// ---- 1. collections: the partner's flat list arranged into a menu: the store's name under ALL ORGANIC
const PARENT_SLUG = "all-organic";
const collections = (await getJson<{ collections: { handle: string; title: string }[] }>(`${BASE}/collections.json?limit=250`))!.collections.filter((c) => !/^(frontpage|home-?page|all)$/i.test(c.handle));   // catch-all shelves are not copied
console.log(`partner collections: ${collections.length}`);

const usedSlug = new Set<string>((await pool.query("SELECT slug FROM categories")).rows.map((r) => r.slug as string));
const uniqueSlug = (s: string) => { let v = s || "collection"; let k = 2; while (usedSlug.has(v)) v = `${s}-${k++}`; usedSlug.add(v); return v; };
async function makeCategory(name: string, parent: string | null, sort: number): Promise<string> {
  const ex = await pool.query("SELECT id FROM categories WHERE name=$1 AND parent_id IS NOT DISTINCT FROM $2", [name, parent]);
  if (ex.rows.length) return ex.rows[0].id;
  const r = await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,$3,$4,FALSE) RETURNING id", [name, uniqueSlug(slugify(name)), parent, sort]);
  return r.rows[0].id;
}
const parentRow = await pool.query("SELECT id FROM categories WHERE slug=$1", [PARENT_SLUG]);
if (!parentRow.rows.length) throw new Error("the ALL ORGANIC collection does not exist");
const rootId = await makeCategory(ROOT, parentRow.rows[0].id, Number((await pool.query("SELECT coalesce(max(sort_order),0)+1 n FROM categories WHERE parent_id=$1", [parentRow.rows[0].id])).rows[0].n));
const catOf = new Map<string, string>(); // partner collection handle -> our category id
const order = collections;
let sort = 1;
for (const c of order) {
  const name = titleCase(noQM(c.title.replace(/\s*\|.*$/, "")));
  const id = await makeCategory(name, rootId, sort++);
  catOf.set(c.handle, id);
}
console.log(`collections ready: ${catOf.size} under "${ROOT}"`);

// ---- 2. which products sit in which collection
const productCats = new Map<string, Set<string>>();
await pool_([...catOf], 4, async ([handle, id]) => {
  for (let pg = 1; pg <= 20; pg++) {
    const d = await getJson<{ products: { handle: string }[] }>(`${BASE}/collections/${handle}/products.json?limit=250&page=${pg}`);
    if (!d || !d.products.length) break;
    for (const p of d.products) { const s = productCats.get(p.handle) ?? new Set<string>(); s.add(id); productCats.set(p.handle, s); }
    if (d.products.length < 250) break;
  }
});
// keep only the deepest collections of each product (the group above shows its children's products anyway)
const parentOf = new Map<string, string | null>((await pool.query("SELECT id, parent_id FROM categories")).rows.map((r) => [r.id, r.parent_id]));
for (const [h, set] of productCats) {
  const drop = new Set<string>();
  for (const id of set) { let p = parentOf.get(id) ?? null; while (p) { if (set.has(p)) drop.add(p); p = parentOf.get(p) ?? null; } }
  productCats.set(h, new Set([...set].filter((id) => !drop.has(id))));
}

// ---- 3. products
const products: KProduct[] = [];
for (let pg = 1; pg <= 20; pg++) {
  const d = await getJson<{ products: KProduct[] }>(`${BASE}/products.json?limit=250&page=${pg}`);
  if (!d || !d.products.length) break;
  products.push(...d.products);
  if (d.products.length < 250) break;
}
console.log(`products in the feed: ${products.length}`);
const existingIds = new Set((await pool.query("SELECT metafields->>'srcId' AS s FROM products WHERE metafields->>'source'=$1", [SRC])).rows.map((r) => r.s as string));
let todo = products.filter((p) => !existingIds.has(String(p.id)));
const LIMIT = Number(opt("limit") ?? 0); if (LIMIT) todo = todo.slice(0, LIMIT);
console.log(`to import now: ${todo.length}`);

async function photo(url: string, file: string): Promise<boolean> {
  const dest = path.join(OUT, file);
  if (fs.existsSync(dest)) return true;
  const u = new URL(url); u.searchParams.set("width", "1000");
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(u, { headers: { "user-agent": UA, accept: "image/webp,image/*;q=0.8" }, signal: AbortSignal.timeout(40000) });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (i + 1)); continue; }
      if (!r.ok) return false;
      await sharp(Buffer.from(await r.arrayBuffer())).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 74 }).toFile(dest);
      return true;
    } catch { await sleep(1500 * (i + 1)); }
  }
  return false;
}

const usedSlugP = new Set<string>((await pool.query("SELECT slug FROM products")).rows.map((r) => r.slug as string));
const uniqueP = (s: string) => { let v = s.slice(0, 120) || "product"; let k = 2; while (usedSlugP.has(v)) v = `${s.slice(0, 115)}-${k++}`; usedSlugP.add(v); return v; };
const usedSku = new Set<string>([...(await pool.query("SELECT sku FROM products")).rows, ...(await pool.query("SELECT sku FROM product_variants")).rows].map((r) => r.sku as string));
const uniqueSku = (s: string) => { let v = s.slice(0, 90) || "CS"; let k = 2; while (usedSku.has(v)) v = `${s.slice(0, 85)}-${k++}`; usedSku.add(v); return v; };
const PROMO = /(off|sale|eid|festival|bachat|exclusive|offer|deal|discount|clearance|others|new year|ramazan|ramadan|friday|%)/i;

let done = 0, photos = 0, failed = 0;
const CH = 24;
for (let i = 0; i < todo.length; i += CH) {
  const chunk = todo.slice(i, i + CH);
  const files = new Map<string, boolean>();
  const plan = chunk.map((p) => ({ p, slug: uniqueP(slugify(noQM(decode(p.title)))) }));
  await pool_(plan.flatMap((x) => x.p.images.map((im, k) => ({ x, im, k }))), 6, async (j) => {
    await sleep(80);
    const f = `${j.x.slug}-${j.k + 1}.webp`; const ok = await photo(j.im.src, f); files.set(f, ok); ok ? photos++ : failed++;
  });
  for (const { p, slug } of plan) {
    const v0 = p.variants[0]; if (!v0) continue;
    const title = clean1252(noQM(decode(p.title))).slice(0, 200);
    const base = Math.round(Number(v0.price) || 0);
    const pct = markupPct(base);
    const up = (n: number) => Math.round(n * (1 + pct / 100));
    const sell = up(base);
    const cmp = up(Math.round(Number(v0.compare_at_price) || 0));
    const marked = cmp > sell ? cmp : sell;
    let desc = clean1252(noQM(strip(p.body_html ?? "")));
    if (desc.length < 40) desc = `${title}. Buy ${title} online in Pakistan at AVERIXA with cash on delivery and delivery across Pakistan.`;
    desc = desc.slice(0, 4000);
    const images = p.images.map((_, k) => `${slug}-${k + 1}.webp`).filter((f) => files.get(f)).map((f) => `/cs/${f}`);
    const type = clean1252(noQM(p.product_type || "")).trim();
    const tags = [...new Set([type, ...p.tags].filter((t) => t && t.length < 30 && !PROMO.test(t)).map((t) => slugify(noQM(t))).filter(Boolean))].slice(0, 8);
    const multi = p.variants.length > 1 || (p.options[0] && p.options[0].name !== "Title");
    const stock = p.variants.reduce((s, v) => s + (v.available ? STOCK : 0), 0);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const ins = await c.query(
        `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, brand_id, stock_quantity, moq, images, tags, metafields)
         VALUES ($1,$2,$3,$4,'DRAFT',$5,$6,NULL,$7,1,$8,$9,$10) ON CONFLICT (slug) DO NOTHING RETURNING id`,
        [title, slug, uniqueSku(v0.sku || `CS-${p.id}`), desc, marked, sell, stock, JSON.stringify(images), tags,
         JSON.stringify({ source: SRC, srcId: String(p.id), markupApplied: true, markupPct: pct, priceBeforeMarkup: base, productType: type })]
      );
      if (!ins.rowCount) { await c.query("ROLLBACK"); continue; }
      const pid = ins.rows[0].id as string;
      if (multi) {
        for (const v of p.variants) {
          const attrs: Record<string, string> = {};
          p.options.forEach((o, k) => { const val = [v.option1, v.option2, v.option3][k]; if (val && o.name !== "Title") attrs[clean1252(noQM(o.name)).toLowerCase()] = clean1252(noQM(val)); });
          const ix = v.featured_image?.position ? v.featured_image.position - 1 : null;
          const vp = Math.round(Number(v.price) || 0);
          await c.query(
            "INSERT INTO product_variants (product_id, title, sku, price, stock_quantity, variant_attributes, image_index) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            [pid, clean1252(noQM(v.title)).slice(0, 200), uniqueSku(v.sku || `CS-${v.id}`), vp ? Math.round(vp * (1 + markupPct(vp) / 100)) : sell, v.available ? STOCK : 0, JSON.stringify(attrs), ix !== null && ix < images.length ? ix : null]
          );
        }
      }
      for (const cid of productCats.get(p.handle)?.size ? productCats.get(p.handle)! : [rootId]) await c.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [pid, cid]);
      await c.query("COMMIT"); done++;
    } catch (e) { await c.query("ROLLBACK"); console.log(`  skipped ${slug}: ${(e as Error).message}`); } finally { c.release(); }
  }
  console.log(`imported ${done}/${todo.length}  photos ${photos} (failed ${failed})`);
}
await delPattern("catalog:*").catch(() => {});
console.log(`finished: ${done} products, ${photos} photos, ${failed} photos failed`);
await pool.end();
process.exit(0);
