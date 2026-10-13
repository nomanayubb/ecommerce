// One-time price increase on every product (and every option price) using the tiers in markup.ts.
//   npx tsx scripts/apply-markup.ts --dry     only show what would change
//   npx tsx scripts/apply-markup.ts           apply it
// Safe against running twice: a product marked "markupApplied" is skipped. The old price is kept in metafields.priceBeforeMarkup.
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";
import { MARKUP_TIERS, markupPct } from "./markup.js";

const DRY = process.argv.includes("--dry");
const rows = (await pool.query(
  "SELECT id, selling_price::float AS sell, marked_price::float AS marked FROM products WHERE coalesce(metafields->>'markupApplied', '') <> 'true'"
)).rows as { id: string; sell: number; marked: number }[];

const tierCount = new Map<number, number>();
const upd: { id: string; sell: number; marked: number; pct: number; before: number }[] = [];
for (const r of rows) {
  const pct = markupPct(r.sell);
  tierCount.set(pct, (tierCount.get(pct) ?? 0) + 1);
  if (!pct) continue;
  const f = 1 + pct / 100;
  const sell = Math.round(r.sell * f);
  upd.push({ id: r.id, sell, marked: Math.max(sell, Math.round(r.marked * f)), pct, before: r.sell });
}
console.log("products to update:", upd.length, "of", rows.length, "| by tier:", JSON.stringify([...tierCount].sort((a, b) => b[0] - a[0])));
console.log("examples:", [50, 100, 500, 999, 1000, 1999, 2000, 9999, 10000, 50000, 100000, 300000, 700000, 800000].map((p) => `${p}->${Math.round(p * (1 + markupPct(p) / 100))}`).join("  "));
console.log("tiers:", MARKUP_TIERS.map((t) => `<=${t.upTo}: +${t.pct}%`).join(", "));
if (DRY) { await pool.end(); process.exit(0); }

const c = await pool.connect();
try {
  await c.query("BEGIN");
  for (let i = 0; i < upd.length; i += 1500) {
    const ch = upd.slice(i, i + 1500);
    await c.query(
      `UPDATE products p SET selling_price = v.s, marked_price = v.m, updated_at = now(), metafields = p.metafields || v.meta
         FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::numeric[]) AS s, unnest($3::numeric[]) AS m, unnest($4::jsonb[]) AS meta) v WHERE p.id = v.id`,
      [ch.map((u) => u.id), ch.map((u) => u.sell), ch.map((u) => u.marked), ch.map((u) => JSON.stringify({ markupApplied: true, markupPct: u.pct, priceBeforeMarkup: u.before }))]
    );
  }
  // products the rule does not change (zero price, or above the top tier) are still marked as handled
  const none = rows.filter((r) => !markupPct(r.sell)).map((r) => r.id);
  if (none.length) await c.query("UPDATE products SET metafields = metafields || '{\"markupApplied\": true, \"markupPct\": 0}'::jsonb WHERE id = ANY($1::uuid[])", [none]);
  // option prices (sizes, colours) follow the same tiers, each by its own price
  const vs = (await c.query("SELECT id, price::float AS price FROM product_variants")).rows as { id: string; price: number }[];
  const vu = vs.filter((v) => markupPct(v.price)).map((v) => ({ id: v.id, price: Math.round(v.price * (1 + markupPct(v.price) / 100)) }));
  for (let i = 0; i < vu.length; i += 1500) {
    const ch = vu.slice(i, i + 1500);
    await c.query("UPDATE product_variants pv SET price = v.p FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::numeric[]) AS p) v WHERE pv.id = v.id", [ch.map((x) => x.id), ch.map((x) => x.price)]);
  }
  await c.query("COMMIT");
  console.log(`done: ${upd.length} products and ${vu.length} option prices raised`);
} catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
await delPattern("catalog:*").catch(() => {});
await pool.end();
process.exit(0);
