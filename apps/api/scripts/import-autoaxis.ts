// Imports the Autoaxis parts collected by crawl-autoaxis.ts (in stock, with a price) into the CURRENT database (DATABASE_URL = shop_autoparts) with the shop's sliding mark-up.
//   DATABASE_URL=postgres://.../shop_autoparts npx tsx scripts/import-autoaxis.ts [--publish] [--limit N] [--photos dir] [--workers 6]
// Menus: 6 groups with sub menus, worked out from the product name (floor mats, dashboard covers, key covers, lighting, wipers ...). Vehicle make and model are read from the name and become
// the filters (brand = make, tags = make and make-model, plus part type); `vehicles.json` (make -> models) is written for the shop's vehicle finder. Re-running skips parts already imported.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pool } from "../src/lib/db.js";
import { delPattern } from "../src/lib/redis.js";
import { markupPct } from "./markup.js";

sharp.cache(false);
const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : undefined);
const publish = args.includes("--publish"), LIMIT = Number(opt("limit") ?? 0) || Infinity, WORKERS = Number(opt("workers") ?? 6) || 6;
const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, "../data/autoaxis");
const PHOTOS = path.resolve(opt("photos") ?? path.join(here, "../../web-autoparts/public/cs"));
const VEH = path.resolve(path.join(here, "../../web-autoparts/public/vehicles.json"));
fs.mkdirSync(PHOTOS, { recursive: true });
const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/autoparts/.test(db)) throw new Error(`refusing to run on database "${db}" (this import is for the autoparts shop)`);
const UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import)";
const SRC = "autoaxis";

type Part = { id: number; name: string; price: number; was: number | null; sku: string | null; image: string; description: string; seller: string | null; url: string };
const parts = new Map<number, Part>();
for (const f of fs.readdirSync(DATA).filter((x) => /^parts.*\.ndjson$/.test(x))) for (const l of fs.readFileSync(path.join(DATA, f), "utf8").split("\n")) { if (!l.trim()) continue; try { const p = JSON.parse(l) as Part; parts.set(p.id, p); } catch { /* skip */ } }
console.log(`parts read: ${parts.size}`);

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const W1252 = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const clean1252 = (s: string) => Array.from(s).filter((ch) => { const c = ch.codePointAt(0)!; return c < 0x100 || W1252.has(ch); }).join("").replace(/[ \t]{2,}/g, " ").trim();
const used = new Set<string>((await pool.query("SELECT slug FROM categories")).rows.map((r) => r.slug as string));
const uniq = (set: Set<string>, s: string) => { let v = s, n = 2; while (set.has(v)) v = `${s}-${n++}`; set.add(v); return v; };

// ---- menus: group -> [sub menu, pattern]
const MENU: [string, [string, RegExp][]][] = [
  ["Interior", [["Floor Mats", /floor mat|trunk mat|boot mat|rubber mat|latex mat|carpet mat|car mat|\bmats?\b(?!.*dash)/i], ["Dashboard Covers", /dash ?board (cover|carpet|mat)|dash ?cover|dash mat|dashmat/i], ["Seat Covers", /seat cover/i], ["Sunshades and Curtains", /sun ?shade|curtain|sun visor|windshield cover/i],
    ["Interior Lighting", /ambient|ceiling|galaxy|star|interior.*light|foot light|roof.*light/i], ["Steering and Gear Knobs", /steering|gear knob|shift knob|stick shift|gear shift/i], ["Interior Trim", /ppf|\btrim\b|chrome|interior (kit|panel)/i]]],
  ["Exterior", [["Key Covers and Cases", /key ?cover|key ?case|key ?cap|key ?fob|keycover/i], ["Mirror Covers", /mirror cover|side mirror/i], ["Grilles and Body Styling", /grille|spoiler|bumper|fender|body kit|lip\b|diffuser|skirt|garnish/i], ["Wheel and Brake Covers", /caliper|wheel cover|hub ?cap|\brim\b|tyre|tire|wheel/i],
    ["Car Covers", /top cover|car cover|body cover|hood cover/i], ["Emblems and Decor", /sculpture|ornament|emblem|monogram|logo|badge|sticker|decal/i]]],
  ["Lighting", [["Headlights and Bulbs", /headlight|head light|led bulb|bulb|\bh4\b|\bh7\b|\bh11\b|led white|halogen|hid\b/i], ["Lamps and Lights", /lamp|tail ?light|fog ?light|light|led/i]]],
  ["Wipers and Filters", [["Wiper Blades", /wiper/i], ["Filters", /\bfilter\b/i]]],
  ["Care and Cleaning", [["Air Fresheners and Perfume", /air fresh|freshener|perfume|cologne|fragrance|diffuser/i], ["Cleaning and Detailing", /clean|detail|polish|wax|wash|microfiber|gloves|pills|shampoo|spray|coating|\bfoam\b/i], ["Tools and Accessories", /tool|tape|\bkit\b|organizer|holder|charger|cable|jump|inflator|compressor/i]]],
  ["Body and Mechanical", [["Body Panels and Liners", /liner|panel|capa certified|door|hood|mudguard|mud flap/i], ["Engine and Brakes", /brake|pad|rotor|engine|oil|spark|battery|suspension|shock|clutch|bearing|belt|radiator/i]]],
];
const OTHER: [string, string] = ["Accessories", "Other Accessories"];
const classify = (n: string): [string, string] => { for (const [g, subs] of MENU) for (const [s, re] of subs) if (re.test(n)) return [g, s]; return OTHER; };

// ---- vehicle make and model from the name
const MAKES = ["Toyota", "Honda", "Suzuki", "KIA", "Hyundai", "Changan", "MG", "Haval", "DFSK", "Daihatsu", "Nissan", "Mitsubishi", "BYD", "BAIC", "Mercedes", "BMW", "Audi", "Isuzu", "FAW", "Proton", "Peugeot", "Ford", "Chevrolet", "Lexus", "Tesla", "Mazda", "Subaru", "Jetour", "Chery", "GAC", "JAC", "Land Rover", "Range Rover", "Volkswagen", "Porsche", "Jaguar", "Prince", "United", "Master", "Dongfeng", "Foton", "Ssangyong", "Renault", "Opel", "Fiat", "Jeep", "Infiniti", "Acura", "Volvo", "Mini", "Seres", "Deepal", "Zotye"];
const MODEL_MAKE: Record<string, string> = { corolla: "Toyota", civic: "Honda", cultus: "Suzuki", alto: "Suzuki", wagon: "Suzuki", swift: "Suzuki", mehran: "Suzuki", bolan: "Suzuki", sportage: "KIA", picanto: "KIA", sorento: "KIA", stonic: "KIA", tucson: "Hyundai", elantra: "Hyundai", sonata: "Hyundai", yaris: "Toyota", fortuner: "Toyota", hilux: "Toyota", revo: "Toyota", vigo: "Toyota", prado: "Toyota", "land cruiser": "Toyota", camry: "Toyota", vitz: "Toyota", passo: "Toyota", platz: "Toyota", crown: "Toyota", aqua: "Toyota", prius: "Toyota", city: "Honda", brv: "Honda", hrv: "Honda", vezel: "Honda", accord: "Honda", oshan: "Changan", alsvin: "Changan", karvaan: "Changan", h6: "Haval", jolion: "Haval", glory: "DFSK", mira: "Daihatsu", move: "Daihatsu", cuore: "Daihatsu", tiago: "Tata", atto: "BYD", zs: "MG", hs: "MG", bj40: "BAIC" };
const vehicleOf = (n: string): { make: string | null; model: string | null } => {
  const t = n.replace(/[()|,–-]/g, " ").replace(/\s+/g, " ");
  let make: string | null = null, i = -1;
  for (const m of MAKES) { const re = new RegExp(`(^|\\s)${m.replace(/\s/g, "\\s")}(\\s|$)`, "i"); const x = re.exec(t); if (x && (i < 0 || x.index < i)) { make = m === "Range Rover" || m === "Land Rover" ? "Land Rover" : m; i = x.index; } }
  const low = t.toLowerCase(); let model: string | null = null;
  if (make) { const after = t.slice(i).replace(new RegExp(`^\\s*${make.replace(/\s/g, "\\s")}\\s*`, "i"), "").split(" ").filter(Boolean); const stop = /^(\d{4}|model|for|with|fits|tpe|pvc|rubber|floor|dash|dashboard|key|seat|side|car|front|rear|led|premium|soft|silicone|metal|imported|custom|velvet|black|style|retractable)$/i; const w: string[] = []; for (const x of after) { if (stop.test(x) || /^\d{4}/.test(x) || w.length >= 2) break; w.push(x); } model = w.join(" ") || null; }
  if (!make) for (const [k, mk] of Object.entries(MODEL_MAKE)) if (new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(low)) { make = mk; model = k.replace(/^./, (c) => c.toUpperCase()); break; }
  if (make && !model) for (const k of Object.keys(MODEL_MAKE)) if (MODEL_MAKE[k] === make && new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(low)) { model = k.replace(/^./, (c) => c.toUpperCase()); break; }
  return { make, model: model ? model.replace(/\s+/g, " ").trim() : null };
};
const tidy = (s: string) => { let t = clean1252(s.replace(/\s+/g, " ").replace(/^[-–| ]+|[-–| ]+$/g, "")); if (t === t.toUpperCase() && /[A-Z]{4}/.test(t)) t = t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()); return t.slice(0, 200); };

// ---- menus in the database
const gid = new Map<string, string>(), sid = new Map<string, string>(); let ord = 0;
for (const [g, subs] of [...MENU, [OTHER[0], [[OTHER[1], /x/]]] as [string, [string, RegExp][]]]) {
  const ex = (await pool.query("SELECT id FROM categories WHERE parent_id IS NULL AND lower(name)=lower($1)", [g])).rows[0]?.id as string | undefined;
  const gi = ex ?? (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,NULL,$3,$4) RETURNING id", [g, uniq(used, slugify(g)), ++ord, publish])).rows[0].id as string; gid.set(g, gi);
  let so = 0; for (const [s] of subs) { const ex2 = (await pool.query("SELECT id FROM categories WHERE parent_id=$1 AND lower(name)=lower($2)", [gi, s])).rows[0]?.id as string | undefined;
    sid.set(`${g}/${s}`, ex2 ?? (await pool.query("INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id", [s, uniq(used, slugify(s)), gi, ++so, publish])).rows[0].id as string); }
}
const brandId = new Map<string, string>();
const getBrand = async (name: string) => { const k = name.toLowerCase(); if (brandId.has(k)) return brandId.get(k)!; const ex = (await pool.query("SELECT id FROM brands WHERE lower(name)=lower($1)", [name])).rows[0]?.id as string | undefined;
  const id = ex ?? (await pool.query("INSERT INTO brands (name, slug) VALUES ($1,$2) RETURNING id", [name, uniq(new Set<string>((await pool.query("SELECT slug FROM brands")).rows.map((r) => r.slug as string)), slugify(name))])).rows[0].id as string; brandId.set(k, id); return id; };

const done = new Set<number>((await pool.query("SELECT (metafields->>'srcId')::int s FROM products WHERE metafields->>'source'=$1", [SRC])).rows.map((r) => r.s as number));
const taken = new Set<string>((await pool.query("SELECT slug FROM products")).rows.map((r) => r.slug as string));
const skus = new Set<string>((await pool.query("SELECT sku FROM products")).rows.map((r) => r.sku as string));
async function photo(p: Part, slug: string): Promise<string | null> {
  let buf: Buffer | null = null;
  for (let t = 0; t < 3 && !buf; t++) { try { const r = await fetch(p.image, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(40000) }); if (r.ok) buf = Buffer.from(await r.arrayBuffer()); else if (r.status < 429) break; } catch { /* retry */ } if (!buf) await new Promise((r) => setTimeout(r, 1200 * (t + 1))); }
  if (!buf) return null;
  try {
    const flat = sharp(buf).rotate().flatten({ background: "#ffffff" }); const tr = await flat.clone().trim({ threshold: 14 }).toBuffer({ resolveWithObject: true }); const m = await flat.clone().metadata();
    const ok = tr.info.width >= (m.width ?? 0) * 0.2 && tr.info.height >= (m.height ?? 0) * 0.2;
    const fit = await sharp(ok ? tr.data : await flat.toBuffer()).resize({ width: 720, height: 720, fit: "inside" }).toBuffer();
    const f = `ap-${p.id}.webp`;
    await sharp({ create: { width: 800, height: 800, channels: 4, background: "#ffffff" } }).composite([{ input: fit, gravity: "centre" }]).webp({ quality: 76 }).toFile(path.join(PHOTOS, f));
    return `/cs/${f}`;
  } catch { return null; }
}
const vehicles = new Map<string, Map<string, number>>();
let n = 0, photos = 0, skipped = 0;
const queue = [...parts.values()].filter((p) => !done.has(p.id)).slice(0, LIMIT); let qi = 0;
async function one(p: Part) {
  const t = tidy(p.name); if (!t) { skipped++; return; }
  const [g, s] = classify(t), v = vehicleOf(t); const slug = uniq(taken, slugify(t).slice(0, 100) || `part-${p.id}`);
  const img = await photo(p, slug);
  const base = Math.round(p.price), pct = markupPct(base), sell = Math.round(base * (1 + pct / 100)), marked = p.was && p.was > p.price ? Math.max(sell, Math.round(p.was * (1 + pct / 100))) : sell;
  let desc = clean1252(p.description.replace(/\s+/g, " ").replace(/\bAuto ?Axis\b/gi, "AVERIXA Auto Parts").replace(/^Buy\s+/i, "")); if (desc.length > 700) desc = desc.slice(0, 700).replace(/\s+\S*$/, "") + "...";
  if (desc.length < 40) desc = `${t}. Genuine quality auto part, delivered across Pakistan with cash on delivery.`;
  const tags = [...new Set([v.make ? slugify(v.make) : "universal", v.make && v.model ? slugify(`${v.make} ${v.model}`) : null, slugify(s), slugify(g)].filter(Boolean) as string[])];
  const seoTitle = (t.length + 18 <= 62 ? `${t} Price in Pakistan` : t).slice(0, 62), seoDescription = `Buy ${t} online in Pakistan for Rs. ${sell.toLocaleString("en-US")}. In stock, cash on delivery and delivery across Pakistan.`.slice(0, 158);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const pid = (await c.query(
      `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, brand_id, stock_quantity, moq, images, tags, metafields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,9999,1,$9,$10,$11) RETURNING id`,
      [t, slug, uniq(skus, `AX-${p.sku ?? p.id}`), desc.slice(0, 4000), publish ? "PUBLISHED" : "DRAFT", marked, sell, v.make ? await getBrand(v.make) : null, JSON.stringify(img ? [img] : []), tags,
       JSON.stringify({ source: SRC, srcId: p.id, markupApplied: true, markupPct: pct, priceBeforeMarkup: base, seoTitle, seoDescription, vehicleMake: v.make, vehicleModel: v.model })])).rows[0].id as string;
    await c.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2)", [pid, sid.get(`${g}/${s}`)]);
    await c.query("COMMIT"); n++; if (img) photos++;
    if (v.make) { const m = vehicles.get(v.make) ?? new Map<string, number>(); if (v.model) m.set(v.model, (m.get(v.model) ?? 0) + 1); vehicles.set(v.make, m); }
  } catch (e) { await c.query("ROLLBACK"); console.log(`  skipped ${slug}: ${(e as Error).message}`); } finally { c.release(); }
}
await Promise.all(Array.from({ length: WORKERS }, async () => { while (qi < queue.length) { const p = queue[qi++]; await one(p).catch((e) => console.log(`  ${p.id}: ${(e as Error).message}`)); if (qi % 200 === 0) console.log(`imported ${n}/${queue.length}  photos ${photos}`); } }));
console.log(`finished: ${n} products, ${photos} photos, ${skipped} skipped, status ${publish ? "PUBLISHED" : "DRAFT"}`);

// the vehicle finder reads this list (make -> models with at least 1 part), built from everything in the database
const rows = (await pool.query("SELECT metafields->>'vehicleMake' mk, metafields->>'vehicleModel' md, count(*) c FROM products WHERE metafields->>'source'=$1 AND metafields->>'vehicleMake' IS NOT NULL GROUP BY 1,2", [SRC])).rows;
const out: Record<string, { name: string; slug: string; count: number; models: { name: string; slug: string; count: number }[] }> = {};
for (const r of rows) { const k = r.mk as string; out[k] ??= { name: k, slug: slugify(k), count: 0, models: [] }; out[k].count += Number(r.c); if (r.md) out[k].models.push({ name: r.md as string, slug: slugify(`${k} ${r.md}`), count: Number(r.c) }); }
const list = Object.values(out).sort((a, b) => b.count - a.count).map((m) => ({ ...m, models: m.models.sort((a, b) => b.count - a.count) }));
fs.writeFileSync(VEH, JSON.stringify(list));
console.log(`vehicle finder list: ${list.length} makes, ${list.reduce((a, b) => a + b.models.length, 0)} models`);
await delPattern("catalog:*").catch(() => {}); await delPattern("categories:*").catch(() => {});
await pool.end();
process.exit(0);
