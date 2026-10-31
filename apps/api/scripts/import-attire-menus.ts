// Rebuilds the menus and brands of the ATTIRE shop to match attirebulk.com (DATABASE_URL = shop_attire; refuses any other database). Run it AFTER import-attire.ts.
//   DATABASE_URL=postgres://.../shop_attire npx tsx scripts/import-attire-menus.ts
// Inputs (apps/api/data/attire, written by the Chrome crawl): menu_tree.json (the site's own menu: 13 groups, each with its categories and styles in the site's order), menu_members.json (the product ids shown on
// every menu page), brands.json (the site's 40 brands with logos), raw.ndjson. Result: every group is a top menu, its categories/styles are the sub menus (same names and order, same-named items merged),
// each with the site's own picture framed as a mehrab tile; every product is linked to the sub menus whose page lists it (only within the groups that fit its type: Women / Girls / Boys / Baby / Men),
// and all 40 brands exist with their logos, products pointing at their own brand.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";

sharp.cache(false);
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/attire/.test(db)) throw new Error(`refusing to run on database "${db}"`);
const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, "../data/attire"), PHOTOS = path.resolve(here, "../../web-attire/public/cs");
fs.mkdirSync(PHOTOS, { recursive: true });
const ORIGIN = "https://attirebulk.com", UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import)";
const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const tidy = (s: string) => { let t = s.replace(/_/g, " ").replace(/\s+/g, " ").trim(); if (/^\d+\s*to\s*\d+$/i.test(t)) t = `Sizes ${t.replace(/\s*to\s*/i, " to ")}`; if (t === t.toUpperCase() && /[A-Z]{3}/.test(t)) t = t.toLowerCase(); return t.replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bAnd\b/g, "and"); };

type Item = { kind: "category" | "style"; id: number; slug: string; img: string; label: string };
const tree = JSON.parse(fs.readFileSync(path.join(DATA, "menu_tree.json"), "utf8")) as { group: string; items: Item[] }[];
const members = JSON.parse(fs.readFileSync(path.join(DATA, "menu_members.json"), "utf8")) as Record<string, number[]>;
const brands = JSON.parse(fs.readFileSync(path.join(DATA, "brands.json"), "utf8")) as [string, string, string, string][];   // [id, slug, logo, name]
const memOf = (it: Item) => new Set(members[`/${it.kind}/${it.id}/${it.slug}`] ?? []);

// ---- pictures: the site's own tile photo framed as a mehrab on wine
const latticeBg = (w: number, h: number) => { const s = 48, p: string[] = []; for (let x = 0; x <= w + s; x += s) for (let y = 0; y <= h + s; y += s) p.push(`<path d="M${x} ${y - s / 2} L${x + s / 2} ${y} L${x} ${y + s / 2} L${x - s / 2} ${y} Z" fill="none" stroke="#c9a56a" stroke-opacity=".10"/>`);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a0f1c"/><stop offset="1" stop-color="#7d1d3f"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${p.join("")}</svg>`); };
const archPath = (w: number, h: number) => `M0 ${h} V${h * 0.42} C0 ${h * 0.16} ${w * 0.3} ${h * 0.03} ${w / 2} 0 C${w * 0.7} ${h * 0.03} ${w} ${h * 0.16} ${w} ${h * 0.42} V${h} Z`;
async function tile(src: Buffer, out: string) {
  const W = 800, H = 600, aw = 400, ah = 540;
  const photo = await sharp(src).flatten({ background: "#e9e1d4" }).resize({ width: aw, height: ah, fit: "cover", position: "north" }).png().toBuffer();
  const cut = await sharp(photo).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${aw}" height="${ah}"><path d="${archPath(aw, ah)}" fill="#fff"/></svg>`), blend: "dest-in" }]).png().toBuffer();
  const line = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${aw}" height="${ah}"><path d="${archPath(aw - 4, ah - 2)}" transform="translate(2 1)" fill="none" stroke="#c9a56a" stroke-width="4"/></svg>`);
  await sharp(latticeBg(W, H)).composite([{ input: cut, left: (W - aw) / 2, top: H - ah - 30 }, { input: line, left: (W - aw) / 2, top: H - ah - 30 }]).webp({ quality: 86 }).toFile(path.join(PHOTOS, out));
}
const dl = async (u: string): Promise<Buffer | null> => { for (let t = 0; t < 3; t++) { try { const r = await fetch(ORIGIN + encodeURI(decodeURI(u)), { headers: { "user-agent": UA }, signal: AbortSignal.timeout(40000) }); if (r.ok) return Buffer.from(await r.arrayBuffer()); } catch { /* retry */ } await new Promise((r) => setTimeout(r, 1200 * (t + 1))); } return null; };

// ---- start clean: this shop's menus are rebuilt from the site's tree
// the "2026 Winter Collection" menu (import-bonanza-winter.ts, not from attirebulk) is kept: its slugs start with 2026-winter-collection
await pool.query("DELETE FROM product_categories WHERE category_id IN (SELECT id FROM categories WHERE slug NOT LIKE '2026-winter-collection%')");
await pool.query("DELETE FROM categories WHERE slug NOT LIKE '2026-winter-collection%'");
const used = new Set<string>((await pool.query("SELECT slug FROM categories")).rows.map((r) => r.slug as string));
const uniq = (s: string) => { let v = s, n = 2; while (used.has(v)) v = `${s}-${n++}`; used.add(v); return v; };

// ---- products by supplier id
const prods = (await pool.query("SELECT id, (metafields->>'srcId')::int sid, title, (SELECT array_agg(DISTINCT trim(x)) FROM unnest(ARRAY[metafields->>'madeBy']) x) mk FROM products WHERE metafields->>'source'='attirebulk'")).rows as { id: string; sid: number; title: string; mk: string[] | null }[];
const raw = new Map<number, { title: string; sizes: string[]; crumbs: string[] }>();
for (const l of fs.readFileSync(path.join(DATA, "raw.ndjson"), "utf8").split("\n")) { if (!l.trim()) continue; try { const o = JSON.parse(l); if (o.unit && o.id) raw.set(o.id, o); } catch { /* skip */ } }

// ---- groups and sub menus (same names, same order; same-named items inside a group are merged)
const PREFIX: Record<string, string[]> = {
  Women: ["Women Eastern (stitched)", "Women Catalogues (stitched)", "Women Catalogues (unstitched)", "Women Western", "Women Footwear"],
  Girls: ["Girls Eastern (stitched)", "Girls Western"], Boys: ["Boys Active Wear", "Boys Western", "Boys Eastern"], Baby: ["Baby Eastern (stitched)", "Baby Western"], Men: ["Western Men", "Men's Shalwar Kameez"],
};
type Node = { id: string; group: string; label: string; members: Set<number> };
const nodes: Node[] = [], groupId = new Map<string, string>(); let gOrd = 0, pics = 0;
for (const g of tree) {
  const gid = (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,NULL,$3,true) RETURNING id", [tidy(g.group.replace(/\s*\((stitched|unstitched)\)/i, (m) => m)), uniq(slugify(g.group)), ++gOrd])).rows[0].id as string;
  groupId.set(g.group, gid);
  const merged = new Map<string, { label: string; its: Item[] }>();
  for (const it of g.items) { const k = tidy(it.label).toLowerCase(); (merged.get(k) ?? merged.set(k, { label: tidy(it.label), its: [] }).get(k)!).its.push(it); }
  let so = 0;
  for (const m of merged.values()) {
    const id = (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,$3,$4,true) RETURNING id", [m.label, uniq(slugify(`${g.group} ${m.label}`)), gid, ++so])).rows[0].id as string;
    const mem = new Set<number>(); for (const it of m.its) for (const x of memOf(it)) mem.add(x);
    nodes.push({ id, group: g.group, label: m.label, members: mem });
    const buf = await dl(m.its[0].img); if (buf) { const f = `atc-${slugify(g.group)}-${slugify(m.label)}.webp`; await tile(buf, f); await pool.query("UPDATE categories SET image_url=$2 WHERE id=$1", [id, `/cs/${f}`]); pics++; }
  }
}
// group pictures: the picture of its first sub menu that has one
for (const g of tree) { const first = (await pool.query("SELECT image_url FROM categories WHERE parent_id=$1 AND image_url IS NOT NULL ORDER BY sort_order LIMIT 1", [groupId.get(g.group)])).rows[0]?.image_url as string | undefined; if (first) await pool.query("UPDATE categories SET image_url=$2 WHERE id=$1", [groupId.get(g.group), first]); }
console.log(`menus: ${tree.length} groups, ${nodes.length} sub menus, ${pics} pictures`);

// ---- which groups fit a product (by who it is for)
const who = (srcId: number): keyof typeof PREFIX => {
  const o = raw.get(srcId); const t = `${o?.title ?? ""}`; const m = /\bfor (Women|Men|Girls|Boys|Baby|Kids)\b/i.exec(t)?.[1]?.toLowerCase();
  if (m === "women") return "Women"; if (m === "men") return "Men"; if (m === "girls") return "Girls"; if (m === "boys") return "Boys"; if (m === "baby") return "Baby";
  const c = (o?.crumbs ?? []).join(" "); return /Women/.test(c) ? "Women" : /\bMen\b/.test(c) ? "Men" : "Girls";
};
let linked = 0, fallback = 0;
for (const p of prods) {
  const w = who(p.sid), groups = PREFIX[w]; const hit = nodes.filter((n) => groups.includes(n.group) && n.members.has(p.sid));
  const cats = new Set<string>();
  if (hit.length) for (const n of hit) { cats.add(n.id); cats.add(groupId.get(n.group)!); }
  else { cats.add(groupId.get(groups[0])!); fallback++; }
  for (const c of cats) await pool.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [p.id, c]);
  linked++;
}
console.log(`products linked to menus: ${linked} (${fallback} only to their main group because no menu page lists them)`);

// ---- brands: all of the site's, with logos; products point at their own brand
const bId = new Map<string, string>(); let logos = 0;
for (const [id, slugRaw, logo, nameRaw] of brands) {
  const name = nameRaw.replace(/\s+/g, " ").trim().replace(/-$/, "") || slugRaw; const slug = slugify(name);
  let url: string | null = null; const buf = await dl(logo.startsWith("/") ? logo : `/${logo}`);
  if (buf) { try { const f = `brand-${id}-${slug}.webp`; await sharp(buf).flatten({ background: "#ffffff" }).resize({ width: 360, height: 360, fit: "contain", background: "#ffffff" }).webp({ quality: 85 }).toFile(path.join(PHOTOS, f)); url = `/cs/${f}`; logos++; } catch { /* no logo */ } }
  const ex = (await pool.query("SELECT id FROM brands WHERE lower(trim(trailing '-' from trim(name)))=lower($1)", [name])).rows[0]?.id as string | undefined;
  const bid = ex ?? (await pool.query("INSERT INTO brands (name, slug, logo_url) VALUES ($1,$2,$3) ON CONFLICT (slug) DO UPDATE SET logo_url=EXCLUDED.logo_url RETURNING id", [name, slug, url])).rows[0].id as string;
  if (ex && url) await pool.query("UPDATE brands SET logo_url=$2 WHERE id=$1", [ex, url]);
  bId.set(name.toLowerCase(), bid);
}
const fix = await pool.query("UPDATE products p SET brand_id=b.id FROM brands b WHERE lower(trim(trailing '-' from trim(b.name)))=lower(trim(trailing '-' from trim(p.metafields->>'madeBy'))) AND p.brand_id IS DISTINCT FROM b.id");
console.log(`brands: ${brands.length} on the site, ${logos} logos saved, ${fix.rowCount} products re-pointed`);

await delPattern("catalog:*").catch(() => {}); await delPattern("categories:*").catch(() => {});
await pool.end();
process.exit(0);
