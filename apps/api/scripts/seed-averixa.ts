// AVERIXA own-brand set-up (safe to re-run):
//  1. the AVERIXA brand, so "AVERIXA" shows as a brand filter and any product given this brand is picked up;
//  2. an AVERIXA collection at the front of the menu for the shop's own products;
//  3. a search-friendly description for every collection that has none (shown on the collection page and used as its meta description).
// It creates NO products: products come with real photos when the shop launches them.
import { pool } from "../src/lib/db.js";

const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

await pool.query(
  `INSERT INTO brands (name, slug, description) VALUES ('AVERIXA', 'averixa', $1) ON CONFLICT (slug) DO UPDATE SET name = 'AVERIXA'`,
  ["AVERIXA is our own range: considered products at honest prices, delivered across Pakistan with cash on delivery."]
);

await pool.query(
  `INSERT INTO categories (name, slug, description, sort_order) VALUES ('AVERIXA', 'averixa', $1, 5)
   ON CONFLICT (slug) DO UPDATE SET sort_order = 5, description = COALESCE(categories.description, EXCLUDED.description)`,
  ["The AVERIXA range: products made and chosen by us, with honest prices, careful packing and cash on delivery across Pakistan. New AVERIXA products appear here as soon as they launch."]
);

type Row = { id: string; name: string; slug: string; parent_id: string | null; description: string | null };
const rows: Row[] = (await pool.query("SELECT id, name, slug, parent_id, description FROM categories")).rows;
const byId = new Map(rows.map((r) => [r.id, r]));
const kids = new Map<string, Row[]>();
for (const r of rows) if (r.parent_id) kids.set(r.parent_id, [...(kids.get(r.parent_id) ?? []), r]);
const low = (n: string) => n.toLowerCase();

let written = 0;
for (const r of rows) {
  if (r.description || r.slug === "averixa") continue;
  const parent = r.parent_id ? byId.get(r.parent_id) : undefined;
  const subs = (kids.get(r.id) ?? []).slice(0, 4).map((k) => k.name);
  const where = parent ? ` in our ${parent.name} range` : "";
  const subText = subs.length ? ` Explore ${subs.slice(0, -1).join(", ")}${subs.length > 1 ? " and " : ""}${subs[subs.length - 1]} and more.` : "";
  const openers = [
    `Shop ${r.name} online in Pakistan at AVERIXA${where}.`,
    `Buy ${r.name} online from AVERIXA${where}, delivered to your door across Pakistan.`,
    `Discover ${r.name}${where} at AVERIXA, your online store in Pakistan.`,
  ];
  const closers = [
    "Honest prices, careful packing and cash on delivery.",
    "Cash on delivery, fast dispatch and easy support.",
    "Pay when it arrives with cash on delivery, and get easy support if anything is not right.",
  ];
  const text = `${openers[hash(r.slug) % 3]}${subText} ${closers[hash(r.slug + "c") % 3]}`.slice(0, 300);
  await pool.query("UPDATE categories SET description = $2 WHERE id = $1", [r.id, text]);
  written++;
}
console.log(`brand + AVERIXA collection ready; wrote ${written} collection descriptions`);
await pool.end();
