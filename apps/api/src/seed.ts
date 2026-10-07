import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { pool } from "./lib/db.js";

// Dev-only seed. The admin password is random and printed once.
const pw = crypto.randomBytes(9).toString("base64url");
await pool.query(
  `INSERT INTO users (email, password_hash, role) VALUES ('admin@example.com', $1, 'SUPER_ADMIN')
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [await bcrypt.hash(pw, 12)]
);
const cat = async (name: string, slug: string, parent: string | null = null) =>
  (await pool.query(
    `INSERT INTO categories (name, slug, parent_id) VALUES ($1,$2,$3)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [name, slug, parent]
  )).rows[0].id as string;
const electronics = await cat("Electronics", "electronics");
await cat("Phones", "phones", electronics);
console.log(`seeded. admin@example.com / ${pw}`);
await pool.end();
