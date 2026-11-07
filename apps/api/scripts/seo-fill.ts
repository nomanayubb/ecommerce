// Writes a search-engine title and description (metafields seoTitle / seoDescription) for every product of the CURRENT database that has none. Products that already have them are not touched.
//   DATABASE_URL=postgres://.../shop npx tsx scripts/seo-fill.ts [--dry]        (--dry prints 12 samples and writes nothing)
// Title: "<name> Price in Pakistan" when it fits in 62 characters, else the name cut at a word. Description (<= 158): what it is, the brand and category, price, cash on delivery.
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";

const dry = process.argv.includes("--dry");
const cut = (s: string, n: number) => { s = s.replace(/\s+/g, " ").trim(); if (s.length <= n) return s; const c = s.slice(0, n + 1); const i = c.lastIndexOf(" "); return (i > n * 0.6 ? c.slice(0, i) : c.slice(0, n)).replace(/[\s,;:\-–(]+$/, ""); };
const pkr = (n: number) => Math.round(n).toLocaleString("en-US");

const { rows } = await pool.query(`
  SELECT p.id, p.title, p.selling_price::float AS price, b.name AS brand,
    (SELECT c.name FROM product_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.product_id = p.id ORDER BY c.parent_id IS NULL, c.created_at LIMIT 1) AS category
  FROM products p LEFT JOIN brands b ON b.id = p.brand_id
  WHERE coalesce(p.metafields->>'seoTitle', '') = '' OR coalesce(p.metafields->>'seoDescription', '') = ''`);

const make = (r: { title: string; price: number; brand: string | null; category: string | null }) => {
  const t = r.title.replace(/\s+/g, " ").trim();
  const seoTitle = t.length + 20 <= 62 ? `${t} Price in Pakistan` : cut(t, 62);
  const brand = r.brand && r.brand.length > 2 && !/^averixa$/i.test(r.brand) && !t.toLowerCase().includes(r.brand.toLowerCase()) ? r.brand : "";
  const kind = r.category ? r.category.replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  const price = r.price > 0 ? ` for Rs. ${pkr(r.price)}` : "";
  const about = kind ? `${kind}${brand ? ` by ${brand}` : ""}. ` : brand ? `By ${brand}. ` : "";
  let d = `Buy ${t} online in Pakistan${price}. ${about}Cash on delivery and delivery across Pakistan.`;
  if (d.length > 158) d = `Buy ${t} online in Pakistan${price}. Cash on delivery across Pakistan.`;
  if (d.length > 158) d = `Buy ${t}${price}. Cash on delivery across Pakistan.`;
  return { seoTitle, seoDescription: cut(d, 158) };
};

console.log(`${rows.length} products need SEO text`);
if (dry) { for (const r of rows.sort(() => Math.random() - 0.5).slice(0, 12)) { const s = make(r); console.log(`\n${r.title}\n  T (${s.seoTitle.length}): ${s.seoTitle}\n  D (${s.seoDescription.length}): ${s.seoDescription}`); } await pool.end(); process.exit(0); }

let done = 0;
for (let i = 0; i < rows.length; i += 500) {
  const part = rows.slice(i, i + 500), m = part.map(make);
  await pool.query(
    `UPDATE products p SET metafields = coalesce(p.metafields, '{}'::jsonb)
        || CASE WHEN coalesce(p.metafields->>'seoTitle', '') = '' THEN jsonb_build_object('seoTitle', v.t) ELSE '{}'::jsonb END
        || CASE WHEN coalesce(p.metafields->>'seoDescription', '') = '' THEN jsonb_build_object('seoDescription', v.d) ELSE '{}'::jsonb END
     FROM (SELECT unnest($1::uuid[]) id, unnest($2::text[]) t, unnest($3::text[]) d) v WHERE p.id = v.id`,
    [part.map((r) => r.id), m.map((x) => x.seoTitle), m.map((x) => x.seoDescription)]);
  done += part.length;
}
await delPattern("catalog:*").catch(() => {}); await delPattern("product:*").catch(() => {});
console.log(`written for ${done} products`);
await pool.end(); process.exit(0);
