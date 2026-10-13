// Imports a category tree from menu-import.txt ("# top", "## sub", "### sub-sub) into the categories table.
// Safe to re-run: a category with the same name under the same parent is left alone.
// A top-level name that matches an existing category (Electronics) is reused so its products stay attached.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/lib/db.js";

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "menu-import.txt");
const KEEP_CAPS = new Set(["BB", "SS", "LED", "TV", "RC", "2PC", "3PC", "PK"]);
const pretty = (n: string) =>
  n === n.toUpperCase() && /[A-Z]/.test(n)
    ? n.toLowerCase().replace(/(^|[\s(,&-])([a-z0-9])/g, (_, a, b) => a + b.toUpperCase()).replace(/\b[A-Za-z0-9]+\b/g, (w) => (KEEP_CAPS.has(w.toUpperCase()) ? w.toUpperCase() : w))
    : n;
const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
const used = new Set((await pool.query("SELECT slug FROM categories")).rows.map((r) => r.slug as string));
const stack: (string | null)[] = [null, null, null];
const order = [0, 0, 0];
const counts = { created: 0, reused: 0 };

for (const line of lines) {
  const m = line.match(/^(#{1,3}) (.+)$/);
  if (!m) continue;
  const depth = m[1].length - 1;
  const name = pretty(m[2].trim());
  const parentId = depth === 0 ? null : stack[depth - 1];
  if (depth === 0) { order[0]++; order[1] = 0; } else if (depth === 1) { order[1]++; order[2] = 0; } else order[2]++;
  const sort = order[depth] * 10;

  const found = (await pool.query(
    "SELECT id FROM categories WHERE lower(name) = lower($1) AND parent_id IS NOT DISTINCT FROM $2 LIMIT 1", [name, parentId]
  )).rows[0];
  if (found) {
    await pool.query("UPDATE categories SET sort_order = $2 WHERE id = $1", [found.id, sort]);
    stack[depth] = found.id; counts.reused++;
    continue;
  }
  let slug = slugify(name) || "category";
  if (used.has(slug)) {
    const parentSlug = parentId ? (await pool.query("SELECT slug FROM categories WHERE id = $1", [parentId])).rows[0]?.slug : "";
    slug = `${parentSlug ? parentSlug + "-" : ""}${slug}`.slice(0, 80);
    for (let n = 2; used.has(slug); n++) slug = `${slug.replace(/-\d+$/, "")}-${n}`;
  }
  used.add(slug);
  const r = await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order) VALUES ($1,$2,$3,$4) RETURNING id", [name, slug, parentId, sort]);
  stack[depth] = r.rows[0].id; counts.created++;
}
// Categories that were here before and are not in the file go to the end of the menu.
const keep = new Set(lines.filter((l) => l.startsWith("# ")).map((l) => pretty(l.slice(2).trim()).toLowerCase()));
const moved = await pool.query("UPDATE categories SET sort_order = 1000 + sort_order WHERE parent_id IS NULL AND sort_order < 1000 AND lower(name) <> ALL($1)", [[...keep]]);
console.log(`created ${counts.created}, already there ${counts.reused}, older top-level categories moved to the end: ${moved.rowCount}`);
await pool.end();
