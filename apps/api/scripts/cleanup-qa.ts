// Removes test data created by QA runs (users qa.*@example.test, their orders/reviews/addresses, qa newsletter + alerts).
// Safe to re-run. Usage: npx tsx scripts/cleanup-qa.ts
import { pool } from "../src/lib/db.js";

const orders = await pool.query("DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'qa.%@example.test') OR shipping_address->>'name' = 'Qa Buyer' RETURNING 1");
const users = await pool.query("DELETE FROM users WHERE email LIKE 'qa.%@example.test' RETURNING 1");
const subs = await pool.query("DELETE FROM subscribers WHERE email LIKE 'qa.%@example.test' RETURNING 1");
const alerts = await pool.query("DELETE FROM stock_alerts WHERE email LIKE 'qa.%@example.test' RETURNING 1");
console.log(`removed: ${users.rowCount} users (reviews/addresses cascade), ${orders.rowCount} orders, ${subs.rowCount} subscribers, ${alerts.rowCount} stock alerts`);
await pool.end();
