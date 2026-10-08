// Removes test data created by QA runs: users qa.*@example.test (+ their orders/reviews/addresses), qa newsletter + alerts,
// orders placed as "Qa Buyer" / "QA Test" (stock is put back), QA* coupons, QA questions, qa-* recipes/posts/bundles, qa contact messages.
// Safe to re-run. Usage: npx tsx scripts/cleanup-qa.ts
import { pool } from "../src/lib/db.js";

const QA_ORDER = "(user_id IN (SELECT id FROM users WHERE email LIKE 'qa.%@example.test') OR shipping_address->>'name' IN ('Qa Buyer', 'QA Test'))";

// Put reserved stock back before the orders disappear.
const back = await pool.query(
  `WITH q AS (SELECT oi.product_id, oi.variant_id, sum(oi.quantity)::int AS n FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE ${QA_ORDER.replaceAll("user_id", "o.user_id").replaceAll("shipping_address", "o.shipping_address")} GROUP BY 1, 2),
        v AS (UPDATE product_variants pv SET stock_quantity = pv.stock_quantity + q.n FROM q WHERE pv.id = q.variant_id RETURNING 1),
        p AS (UPDATE products pr SET stock_quantity = pr.stock_quantity + q.n FROM q WHERE pr.id = q.product_id AND q.variant_id IS NULL AND NOT pr.is_digital RETURNING 1)
   SELECT (SELECT count(*) FROM v) + (SELECT count(*) FROM p) AS restored`
);
const orders = await pool.query(`DELETE FROM orders WHERE ${QA_ORDER} RETURNING 1`);
const users = await pool.query("DELETE FROM users WHERE email LIKE 'qa.%@example.test' RETURNING 1");
const subs = await pool.query("DELETE FROM subscribers WHERE email LIKE 'qa.%@example.test' RETURNING 1");
const alerts = await pool.query("DELETE FROM stock_alerts WHERE email LIKE 'qa.%@example.test' RETURNING 1");
const msgs = await pool.query("DELETE FROM contact_messages WHERE email LIKE 'qa.%@example.test' RETURNING 1");
const content = await pool.query("WITH r AS (DELETE FROM recipes WHERE slug LIKE 'qa-%' RETURNING 1), p AS (DELETE FROM posts WHERE slug LIKE 'qa-%' RETURNING 1), b AS (DELETE FROM bundles WHERE slug LIKE 'qa-%' RETURNING 1) SELECT (SELECT count(*) FROM r) AS recipes, (SELECT count(*) FROM p) AS posts, (SELECT count(*) FROM b) AS bundles");
const coupons = await pool.query("DELETE FROM coupons WHERE code LIKE 'QA%' RETURNING 1");
const qa = await pool.query("SELECT to_regclass('product_qa') AS t").then(async (r) => (r.rows[0].t ? pool.query("DELETE FROM product_qa WHERE name = 'QA Test' RETURNING 1") : { rowCount: 0 }));
console.log(`removed: ${users.rowCount} users (reviews/addresses cascade), ${orders.rowCount} orders (stock lines restored: ${back.rows[0].restored}), ${subs.rowCount} subscribers, ${alerts.rowCount} stock alerts, ${coupons.rowCount} coupons, ${qa.rowCount} questions, ${msgs.rowCount} messages, QA content ${JSON.stringify(content.rows[0])}`);
await pool.end();
