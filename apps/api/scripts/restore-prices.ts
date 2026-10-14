// Puts every product back to the price it had before apply-markup.ts raised it (the old price is kept in metafields.priceBeforeMarkup).
//   npx tsx scripts/restore-prices.ts --dry     only show what would change
//   npx tsx scripts/restore-prices.ts           restore
// The marked-up prices are kept in metafields.priceWithMarkup / markedWithMarkup, and markupApplied is set to false,
// so running apply-markup.ts again brings the mark-up back.
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";
import { MARKUP_TIERS, markupPct } from "./markup.js";

const DRY = process.argv.includes("--dry");
const rows = (await pool.query(
  `SELECT id, selling_price::float AS sell, marked_price::float AS marked, (metafields->>'priceBeforeMarkup')::float AS before, coalesce((metafields->>'markupPct')::float, 0) AS pct
     FROM products WHERE metafields ? 'priceBeforeMarkup' AND coalesce(metafields->>'markupApplied', '') = 'true'`
)).rows as { id: string; sell: number; marked: number; before: number; pct: number }[];
console.log("products with a recorded old price:", rows.length);
const upd = rows.map((r) => {
  const oldMarked = Math.max(r.before, Math.round(r.marked / (1 + r.pct / 100)));
  return { id: r.id, sell: r.before, marked: oldMarked, nowSell: r.sell, nowMarked: r.marked };
});
console.log("examples:", upd.slice(0, 4).map((u) => `${u.nowSell} -> ${u.sell}`).join("  "));
// Option prices (sizes, colours) were raised by their own tier without a record: find the old price that gives today's price.
const unmark = (price: number): number | null => {
  for (const pct of [...MARKUP_TIERS.map((t) => t.pct), 0]) {
    const o = Math.round(price / (1 + pct / 100));
    if (markupPct(o) === pct && Math.round(o * (1 + pct / 100)) === price) return o;
  }
  return null;
};
const vrows = (await pool.query("SELECT pv.id, pv.price::float AS price FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE p.metafields ? 'priceBeforeMarkup' AND coalesce(p.metafields->>'markupApplied', '') = 'true'")).rows as { id: string; price: number }[];
const vupd = vrows.map((v) => ({ id: v.id, price: unmark(v.price) })).filter((v): v is { id: string; price: number } => v.price !== null);
console.log(`option prices: ${vupd.length} of ${vrows.length} can be restored exactly`);
if (DRY) { await pool.end(); process.exit(0); }

const c = await pool.connect();
try {
  await c.query("BEGIN");
  for (let i = 0; i < upd.length; i += 1500) {
    const ch = upd.slice(i, i + 1500);
    await c.query(
      `UPDATE products p SET selling_price = v.s, marked_price = v.m, updated_at = now(),
              metafields = (p.metafields - 'priceBeforeMarkup') || jsonb_build_object('markupApplied', false, 'priceWithMarkup', v.ns, 'markedWithMarkup', v.nm)
         FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::numeric[]) AS s, unnest($3::numeric[]) AS m, unnest($4::numeric[]) AS ns, unnest($5::numeric[]) AS nm) v WHERE p.id = v.id`,
      [ch.map((u) => u.id), ch.map((u) => u.sell), ch.map((u) => u.marked), ch.map((u) => u.nowSell), ch.map((u) => u.nowMarked)]
    );
  }
  for (let i = 0; i < vupd.length; i += 1500) {
    const ch = vupd.slice(i, i + 1500);
    await c.query("UPDATE product_variants pv SET price = v.p FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::numeric[]) AS p) v WHERE pv.id = v.id", [ch.map((x) => x.id), ch.map((x) => x.price)]);
  }
  await c.query("COMMIT");
  console.log(`restored ${upd.length} product prices and ${vupd.length} option prices`);
} catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
await delPattern("catalog:*").catch(() => {});
await pool.end();
process.exit(0);
