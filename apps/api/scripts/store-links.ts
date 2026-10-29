// Refreshes the sister-store links in EVERY shop listed in /stores.json: the footer column "Our stores" and the header links to the other shops.
//   npx tsx scripts/store-links.ts
// Addresses: https://<subdomain>.<domain> when "domain" is set in stores.json (e.g. "averixa.com"), otherwise the local ports. Re-running never duplicates links.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "../src/lib/db.js";   // loads apps/api/.env (DATABASE_URL)

const reg = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../stores.json"), "utf8")) as { domain: string; stores: { slug: string; name: string; subdomain: string; database: string; webPort: number; inLinks?: boolean; noHeaderLinks?: boolean; footerOnly?: boolean }[] };
const urlFor = (db: string) => { const u = new URL(process.env.DATABASE_URL!); u.pathname = `/${db}`; return u.toString(); };
const addr = (s: (typeof reg.stores)[number]) => (reg.domain ? `https://${s.subdomain ? s.subdomain + "." : ""}${reg.domain}` : `http://localhost:${s.webPort}`);
const merge = <T extends { label: string }>(list: T[], add: T[], drop: string[]) => [...list.filter((x) => !add.some((a) => a.label === x.label) && !drop.includes(x.label)), ...add];
const shown = reg.stores.filter((o) => o.inLinks !== false);   // a store with "inLinks": false (not open yet) is left out of every header and footer
const inFooter = reg.stores.filter((o) => o.inLinks !== false || o.footerOnly);   // "footerOnly": true = listed in the footer column "Our stores" but not in any header
const label = (o: (typeof reg.stores)[number]) => (o.slug === "main" ? "AVERIXA Home" : o.name.replace(/^AVERIXA\s+/i, ""));
for (const s of reg.stores) {
  const p = new pg.Pool({ connectionString: urlFor(s.database) });
  const others = s.noHeaderLinks ? [] : shown.filter((o) => o.slug !== s.slug);   // "noHeaderLinks": true keeps the shop's top menu free of store links (the footer column stays)
  const hidden = (s.noHeaderLinks ? reg.stores : reg.stores.filter((o) => o.inLinks === false)).map(label);
  const br = (await p.query("SELECT value FROM site_settings WHERE key='branding'")).rows[0].value;
  br.navLinks = merge(br.navLinks ?? [], others.map((o) => ({ label: label(o), href: addr(o) })), hidden).slice(0, 12);
  await p.query("UPDATE site_settings SET value=$1 WHERE key='branding'", [br]);
  const f = (await p.query("SELECT value FROM site_settings WHERE key='footer'")).rows[0]?.value ?? { columns: [], showNewsletter: true, showPerks: true, showPayments: true, note: "" };
  f.columns = [...f.columns.filter((c: { title: string }) => c.title !== "Our stores"), { title: "Our stores", links: inFooter.slice(0, 8).map((o) => ({ label: o.name, href: addr(o) })) }].slice(-4);
  await p.query("INSERT INTO site_settings (key, value) VALUES ('footer', $1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [f]);
  console.log(`${s.slug}: header links ${br.navLinks.map((l: { label: string }) => l.label).join(", ")} | footer "Our stores" ${inFooter.length} links`);
  await p.end();
}
process.exit(0);
