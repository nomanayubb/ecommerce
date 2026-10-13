// Imports the KK Mart catalogue (their public Shopify product feed) into this shop, with ALL photos of every product.
// Run by the shop owner, who buys from KK Mart as a partner. Resumable: products already imported (same address) are skipped.
//
//   npx tsx scripts/import-kkmart.ts                 everything (about 14,700 products, about 18,000 photos)
//   npx tsx scripts/import-kkmart.ts --only lipstick only the products of one KK Mart collection (a test)
//   options: --limit 100   --no-images   --pharmacy (include the Pharmacy menu; off by default)
//
// Photos are downloaded, shrunk to WebP (max 900 px wide) and saved in apps/web/public/kk/ (not committed to git).
// Prices are copied as they are. Brands come from the vendor on each KK Mart product.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";

const BASE = "https://www.kkmart.pk";
const UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import; shop partner of KK Mart Multan)";
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../../web/public/kk");
fs.mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const ONLY = opt("only"), LIMIT = Number(opt("limit") ?? 0), NO_IMAGES = flag("no-images"), PHARMACY = flag("pharmacy");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function getJson<T>(url: string): Promise<T | null> {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (i + 1)); continue; }
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch { await sleep(1500 * (i + 1)); }
  }
  return null;
}
async function getText(url: string): Promise<string> {
  for (let i = 0; i < 4; i++) { try { const r = await fetch(url, { headers: { "user-agent": UA } }); if (r.ok) return await r.text(); } catch {} await sleep(1500); }
  return "";
}

const norm = (s: string) => s.toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9]+/g, "");
const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const ACR = new Set(["uk", "usa", "pk", "led", "tv", "bb", "ss", "usb", "uae", "pvc", "pp", "abs", "spf", "rgb", "hd"]);
const SMALL = new Set(["and", "of", "in", "for", "with", "the", "to", "a", "by", "on", "or", "&"]);
const titleCase = (t: string) =>
  t.replace(/\s+/g, " ").trim().split(" ").map((w, i) => {
    if (/\d/.test(w) || (w.length <= 4 && w === w.toUpperCase() && /[A-Z]/.test(w) && w.length > 1 && t !== t.toUpperCase())) return w;
    const lw = w.toLowerCase();
    if (ACR.has(lw)) return lw.toUpperCase();
    return i > 0 && SMALL.has(lw) ? lw : lw.charAt(0).toUpperCase() + lw.slice(1);
  }).join(" ");
const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'");
const strip = (h: string) => decode(h.replace(/<(br|\/p|\/li|\/div|\/h\d)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

type KVariant = { id: number; title: string; sku: string; price: string; compare_at_price: string | null; available: boolean; option1: string | null; option2: string | null; option3: string | null; featured_image?: { position?: number } | null };
type KProduct = { id: number; title: string; handle: string; body_html: string | null; vendor: string; product_type: string; tags: string[]; variants: KVariant[]; images: { src: string; position: number }[]; options: { name: string; values: string[] }[] };

// ---- 1. our collections, and which KK Mart collection feeds which
type Cat = { id: string; name: string; slug: string; parent_id: string | null };
const cats: Cat[] = (await pool.query("SELECT id, name, slug, parent_id FROM categories")).rows;
const byName = new Map<string, Cat[]>();
for (const c of cats) byName.set(norm(c.name), [...(byName.get(norm(c.name)) ?? []), c]);
const parentOf = new Map(cats.map((c) => [c.id, c.parent_id]));
const topOf = (id: string): Cat => { let cur = cats.find((c) => c.id === id)!; while (cur.parent_id) cur = cats.find((c) => c.id === cur.parent_id)!; return cur; };
const ancestors = (id: string) => { const out: string[] = []; let p = parentOf.get(id) ?? null; while (p) { out.push(p); p = parentOf.get(p) ?? null; } return out; };

console.log("reading KK Mart menu...");
const home = await getText(`${BASE}/`);
const navHandles = new Map<string, string>(); // handle -> menu text
for (const m of home.matchAll(/<a[^>]*href="(?:https?:\/\/www\.kkmart\.pk)?\/collections\/([a-z0-9-]+)"[^>]*>\s*([^<]+?)\s*(?:<svg|<\/a>)/gi)) {
  const text = decode(m[2]).replace(/\s+/g, " ").trim();
  if (text && !/^go to /i.test(text) && !navHandles.has(m[1])) navHandles.set(m[1], text);
}
const handleToCats = new Map<string, Cat[]>();
for (const [h, text] of navHandles) { const hit = byName.get(norm(text)); if (hit) handleToCats.set(h, hit); }
console.log(`menu links ${navHandles.size}, matched to our collections ${handleToCats.size}`);

// ---- 2. which products sit in which collection
const productCats = new Map<string, Set<string>>(); // product handle -> our category ids
const wanted = ONLY ? new Map([...handleToCats].filter(([h]) => h === ONLY)) : handleToCats;
if (ONLY && !wanted.size) { const alt = await getJson<{ collection: { title: string } }>(`${BASE}/collections/${ONLY}.json`); const hit = alt && byName.get(norm(alt.collection.title)); if (hit) wanted.set(ONLY, hit); }
let n = 0;
for (const [handle, targets] of wanted) {
  for (let pg = 1; pg <= 60; pg++) {
    const d = await getJson<{ products: { handle: string }[] }>(`${BASE}/collections/${handle}/products.json?limit=250&page=${pg}`);
    if (!d || !d.products.length) break;
    for (const p of d.products) { const s = productCats.get(p.handle) ?? new Set<string>(); targets.forEach((t) => s.add(t.id)); productCats.set(p.handle, s); }
    if (d.products.length < 250) break;
  }
  if (++n % 50 === 0) console.log(`  collections read ${n}/${wanted.size}`);
}
// keep only the deepest collections of each product (parents show their children's products anyway)
for (const [h, set] of productCats) {
  const drop = new Set<string>();
  for (const id of set) for (const a of ancestors(id)) if (set.has(a)) drop.add(a);
  productCats.set(h, new Set([...set].filter((id) => !drop.has(id))));
}
console.log(`products placed in collections: ${productCats.size}`);

// ---- 3. the products themselves
const products: KProduct[] = [];
for (let pg = 1; pg <= 300; pg++) {
  const d = await getJson<{ products: KProduct[] }>(`${BASE}/products.json?limit=250&page=${pg}`);
  if (!d || !d.products.length) break;
  products.push(...d.products);
  if (d.products.length < 250) break;
}
console.log(`products in the KK Mart feed: ${products.length}`);

let todo = products.filter((p) => (ONLY ? productCats.has(p.handle) : true));
if (!PHARMACY) todo = todo.filter((p) => ![...(productCats.get(p.handle) ?? [])].some((id) => norm(topOf(id).name) === "pharmacy"));
const existing = new Set((await pool.query("SELECT slug FROM products")).rows.map((r) => r.slug as string));
todo = todo.filter((p) => !existing.has(slugify(p.handle)));
if (LIMIT) todo = todo.slice(0, LIMIT);
console.log(`to import now: ${todo.length}${PHARMACY ? "" : " (Pharmacy menu left out)"}`);

// ---- 4. photos
async function photo(url: string, file: string): Promise<boolean> {
  const dest = path.join(OUT, file);
  if (fs.existsSync(dest)) return true;
  const u = new URL(url); u.searchParams.set("width", "1000");
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(u, { headers: { "user-agent": UA } });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (i + 1)); continue; }
      if (!r.ok) return false;
      const buf = Buffer.from(await r.arrayBuffer());
      await sharp(buf).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 72 }).toFile(dest);
      return true;
    } catch { await sleep(1500 * (i + 1)); }
  }
  return false;
}
async function pool_<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: size }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

// ---- 5. save
const brandIds = new Map<string, string>((await pool.query("SELECT slug, id FROM brands")).rows.map((r) => [r.slug, r.id]));
const usedSku = new Set<string>([...(await pool.query("SELECT sku FROM products")).rows, ...(await pool.query("SELECT sku FROM product_variants")).rows].map((r) => r.sku as string));
const uniqueSku = (s: string) => { let v = s.slice(0, 90) || "KK"; let k = 2; while (usedSku.has(v)) v = `${s.slice(0, 85)}-${k++}`; usedSku.add(v); return v; };
const PROMO = /(off|sale|eid|festival|bachat|exclusive|offer|deal|discount|clearance|others|new year|ramazan|ramadan|friday|%)/i;

let done = 0, photos = 0, failedPhotos = 0;
const t0 = Date.now();
const CH = 24;
for (let i = 0; i < todo.length; i += CH) {
  const chunk = todo.slice(i, i + CH);
  const jobs = chunk.flatMap((p) => p.images.map((im, k) => ({ p, im, k })));
  const okMap = new Map<string, boolean>();
  if (!NO_IMAGES) await pool_(jobs, 10, async (j) => { const f = `${slugify(j.p.handle).slice(0, 90)}-${j.k + 1}.webp`; const ok = await photo(j.im.src, f); okMap.set(f, ok); ok ? photos++ : failedPhotos++; });

  for (const p of chunk) {
    const slug = slugify(p.handle).slice(0, 120);
    const v0 = p.variants[0];
    if (!v0) continue;
    const title = titleCase(decode(p.title)).slice(0, 200);
    const sell = Math.round(Number(v0.price) || 0);
    const cmp = Math.round(Number(v0.compare_at_price) || 0);
    const marked = cmp > sell ? cmp : sell;
    const vendor = (p.vendor ?? "").trim();
    let desc = strip(p.body_html ?? "");
    if (desc.length < 40 || norm(desc) === norm(p.title)) {
      desc = `${title}${vendor ? ` by ${titleCase(vendor)}` : ""}. Buy ${title} online in Pakistan at AVERIXA with cash on delivery and delivery across Pakistan.`;
    }
    desc = desc.slice(0, 4000);
    const files = p.images.map((_, k) => `${slugify(p.handle).slice(0, 90)}-${k + 1}.webp`).filter((f) => NO_IMAGES || okMap.get(f));
    const images = files.map((f) => `/kk/${f}`);
    const tags = [...new Set(p.tags.filter((t) => !PROMO.test(t) && t.length < 30).map((t) => slugify(t)).filter(Boolean))].slice(0, 8);
    const multi = p.variants.length > 1 || (p.options[0] && p.options[0].name !== "Title");
    const stock = p.variants.reduce((s, v) => s + (v.available ? 20 : 0), 0);

    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      let brandId: string | null = null;
      if (vendor) {
        const bs = slugify(vendor);
        if (!brandIds.has(bs)) {
          const r = await c.query("INSERT INTO brands (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name = brands.name RETURNING id", [titleCase(vendor).slice(0, 100), bs]);
          brandIds.set(bs, r.rows[0].id);
        }
        brandId = brandIds.get(bs)!;
      }
      const ins = await c.query(
        `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, brand_id, stock_quantity, moq, images, tags, metafields)
         VALUES ($1,$2,$3,$4,'PUBLISHED',$5,$6,$7,$8,1,$9,$10,$11) ON CONFLICT (slug) DO NOTHING RETURNING id`,
        [title, slug, uniqueSku(v0.sku || `KK-${p.id}`), desc, marked, sell, brandId, stock, JSON.stringify(images), tags, JSON.stringify({ source: "kkmart", kkProductId: p.id })]
      );
      if (!ins.rowCount) { await c.query("ROLLBACK"); continue; }
      const pid = ins.rows[0].id as string;
      if (multi) {
        for (const v of p.variants) {
          const attrs: Record<string, string> = {};
          p.options.forEach((o, k) => { const val = [v.option1, v.option2, v.option3][k]; if (val && o.name !== "Title") attrs[o.name.toLowerCase()] = val; });
          const imageIndex = v.featured_image?.position ? v.featured_image.position - 1 : null;
          await c.query(
            "INSERT INTO product_variants (product_id, title, sku, price, stock_quantity, variant_attributes, image_index) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            [pid, titleCase(v.title).slice(0, 200), uniqueSku(v.sku || `KK-${v.id}`), Math.round(Number(v.price) || sell), v.available ? 20 : 0, JSON.stringify(attrs), imageIndex !== null && imageIndex < images.length ? imageIndex : null]
          );
        }
      }
      for (const cid of productCats.get(p.handle) ?? []) await c.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [pid, cid]);
      await c.query("COMMIT");
      done++;
    } catch (e) { await c.query("ROLLBACK"); console.log(`  skipped ${slug}: ${(e as Error).message}`); } finally { c.release(); }
  }
  if ((i / CH) % 10 === 0 || i + CH >= todo.length) {
    const rate = done / Math.max(1, (Date.now() - t0) / 60000);
    console.log(`imported ${done}/${todo.length}  photos ${photos} (failed ${failedPhotos})  ${rate.toFixed(0)}/min  eta ${Math.round((todo.length - done) / Math.max(1, rate))} min`);
  }
}
await delPattern("catalog:*").catch(() => {});
console.log(`finished: ${done} products, ${photos} photos, ${failedPhotos} photos failed`);
await pool.end();
process.exit(0);
