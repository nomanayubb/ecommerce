// Creates one more shop that has the same theme, settings, admin login and code as the main shop but its own database, products, menus and orders
// (for example electronics.<domain>). Run from apps/api:
//   npx tsx scripts/new-store.ts <slug> "<Store name>" [subdomain]      e.g.  npx tsx scripts/new-store.ts furniture "AVERIXA Furniture" furniture
// It adds the store to /stores.json (next free ports), creates the database, applies the migrations, copies the main shop's settings and admin users, names the store,
// and refreshes the "Our stores" footer links and the header links of EVERY store. It then prints the commands to build and start the store's API, shop and admin.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import pg from "pg";
import "../src/lib/db.js";   // loads apps/api/.env (DATABASE_URL)

const [slug, name, sub] = process.argv.slice(2);
if (!slug || !name || !/^[a-z][a-z0-9_]{1,30}$/.test(slug)) throw new Error('usage: new-store.ts <slug a-z0-9_> "<Store name>" [subdomain]');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const regFile = path.join(root, "stores.json");
const reg = JSON.parse(fs.readFileSync(regFile, "utf8")) as { domain: string; stores: { slug: string; name: string; subdomain: string; database: string; apiPort: number; webPort: number; adminPort: number }[] };
if (reg.stores.some((s) => s.slug === slug)) throw new Error(`store "${slug}" already exists in stores.json`);
const entry = { slug, name, subdomain: sub ?? slug, database: `shop_${slug}`, apiPort: Math.max(...reg.stores.map((s) => s.apiPort)) + 1, webPort: Math.max(...reg.stores.map((s) => s.webPort)) + 2, adminPort: Math.max(...reg.stores.map((s) => s.adminPort)) + 2 };
const mainUrl = new URL(process.env.DATABASE_URL!);
const urlFor = (db: string) => { const u = new URL(mainUrl); u.pathname = `/${db}`; return u.toString(); };

const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!(await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [entry.database])).rowCount) await admin.query(`CREATE DATABASE ${entry.database}`);
execSync("npx tsx src/migrate.ts", { cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), env: { ...process.env, DATABASE_URL: urlFor(entry.database) }, stdio: "inherit" });

const n = new pg.Pool({ connectionString: urlFor(entry.database) });
for (const r of (await admin.query("SELECT key, value FROM site_settings")).rows) await n.query("INSERT INTO site_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [r.key, r.value]);
const b = (await n.query("SELECT value FROM site_settings WHERE key='branding'")).rows[0].value; b.name = name; b.navLinks = [];
await n.query("UPDATE site_settings SET value=$1 WHERE key='branding'", [b]);
const cols = (await admin.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")).rows.map((r) => r.column_name as string);
for (const u of (await admin.query("SELECT * FROM users WHERE role IN ('SUPER_ADMIN','ADMIN','WAREHOUSE')")).rows)
  await n.query(`INSERT INTO users (${cols.join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT DO NOTHING`, cols.map((c) => u[c]));
await n.end(); await admin.end();

reg.stores.push(entry);
fs.writeFileSync(regFile, JSON.stringify(reg, null, 2) + "\n");
// the list the admin's Store dropdown reads (apps/admin/public/stores.json)
fs.writeFileSync(path.join(root, "apps/admin/public/stores.json"), JSON.stringify(reg.stores.map((s) => ({ slug: s.slug, name: s.name, api: `http://localhost:${s.apiPort}/api/v1` })), null, 2) + "\n");
console.log(`\nstore "${name}" created: database ${entry.database}, API :${entry.apiPort}, shop :${entry.webPort}, admin :${entry.adminPort}`);

execSync("npx tsx scripts/store-links.ts", { cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), stdio: "inherit" });   // header and footer links of every store
console.log(`Next steps (repo root unless noted):
  1. API:    cd apps/api && set PORT=${entry.apiPort}&& set DATABASE_URL=${urlFor(entry.database).replace(/:[^:@/]+@/, ":***@")}&& npx tsx src/server.ts      (use the real password)
  2. Shop:   cd apps/web && set NEXT_DIST_DIR=.next-${slug}&& set NEXT_PUBLIC_API_URL=http://localhost:${entry.apiPort}/api/v1&& npx next build, then the same variables with: npx next start -p ${entry.webPort}
  3. Admin:  cd apps/admin && same variables with NEXT_DIST_DIR=.next-${slug}-admin, build, then: npx next start -p ${entry.adminPort}
  4. Products: import with DATABASE_URL pointing at ${entry.database} (import-store.ts / import-wp.ts / import-product.ts).
  5. Set "domain" in stores.json and run npx tsx scripts/store-links.ts once the real domain exists.`);
process.exit(0);
