// Gives the ELECTRONICS shop its own home page layout (run with DATABASE_URL pointing at shop_electronics; the main shop's home page is never touched):
//   DATABASE_URL=postgres://.../shop_electronics npx tsx scripts/set-electronics-home.ts
// Layout: hero, three promises, shop-by-category showcase, popular products, latest products, brands, "why choose us". Written as the draft and published at once; older content stays in the version history.
import { pool } from "../src/lib/db.js";
import { sanitizeSections } from "../src/lib/sections.js";

const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/electronics/.test(db)) throw new Error(`refusing to run on database "${db}" (this layout is for the electronics shop only)`);

const col = (icon: string, title: string, text: string) => ({ type: "column", settings: { icon, title, text } });
const sections = sanitizeSections([
  { id: "hero-1", type: "hero", settings: {
    variant: "gradient", eyebrow: "AVERIXA Electronics", heading: "Everything for your home, *original and warrantied*",
    text: "Air conditioners, refrigerators, washing machines, kitchen and home appliances from the brands you trust, at honest prices with cash on delivery.",
    primaryLabel: "Shop products", primaryHref: "/products", secondaryLabel: "Air conditioners", secondaryHref: "/collections/air-conditioners-and-cooling", height: "lg" } },
  { id: "trust-1", type: "trust-strip", settings: {
    title1: "100% original products", text1: "Genuine brands with official warranty", icon1: "shield",
    title2: "Competitive prices", text2: "Honest prices on every appliance", icon2: "price",
    title3: "Delivery across Pakistan", text3: "Cash on delivery, fast and reliable", icon3: "truck" } },
  { id: "cats-1", type: "collection-list", settings: { eyebrow: "Explore", heading: "Shop by category", layout: "all", count: 7 } },
  { id: "popular-1", type: "product-carousel", settings: { eyebrow: "Best sellers", heading: "Popular products", count: 10, sort: "popular" } },
  { id: "latest-1", type: "product-carousel", settings: { eyebrow: "Just in", heading: "Latest products", count: 10, sort: "newest" } },
  { id: "brands-1", type: "brand-grid", settings: { eyebrow: "Brands", heading: "Brands we deal in" } },
  { id: "why-1", type: "multicolumn", settings: { heading: "Why choose AVERIXA Electronics", columns: "3" }, blocks: [
    col("shield", "100% original products", "Every product is genuine and comes from the official brand supply."),
    col("star", "Official brand warranty", "Warranty and genuine parts support on every appliance."),
    col("cash", "Competitive prices", "Fair, clear prices with cash on delivery."),
    col("support", "Friendly customer support", "Ask us about any product on WhatsApp before you buy."),
    col("truck", "Fast delivery", "Careful packing and delivery across Pakistan."),
  ] },
]);

const old = (await pool.query("SELECT published, draft FROM page_templates WHERE key='home'")).rows[0];
if (old) await pool.query("INSERT INTO template_versions (key, content, label) VALUES ('home', $1, 'Before the electronics layout')", [old.published ?? old.draft]);
await pool.query(
  `INSERT INTO page_templates (key, title, draft, published, published_at) VALUES ('home', 'Home page', $1, $1, now())
   ON CONFLICT (key) DO UPDATE SET draft = EXCLUDED.draft, published = EXCLUDED.published, published_at = now(), updated_at = now()`,
  [JSON.stringify({ sections })]);
console.log(`home layout written to ${db}: ${sections.map((s) => s.type).join(", ")}`);
await pool.end();
process.exit(0);
