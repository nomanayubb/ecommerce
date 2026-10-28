// Brand and home page of the MOBILES shop (run with DATABASE_URL pointing at shop_mobiles; refuses any other database): logo, pearl and indigo colours, rounded corners,
// announcement strip, and the home layout (hero banner, promises, menus, popular products, brands, why choose us).
import { pool } from "../src/lib/db.js";
import { sanitizeSections } from "../src/lib/sections.js";

const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/mobiles/.test(db)) throw new Error(`refusing to run on database "${db}" (this look is for the mobiles shop only)`);

const b = (await pool.query("SELECT value FROM site_settings WHERE key='branding'")).rows[0].value;
Object.assign(b, {
  name: "AVERIXA Mobiles", tagline: "Premium mobile accessories",
  logoUrl: "/brand/mobiles/logo-horizontal.webp", logoUrlDark: "/brand/mobiles/logo-horizontal-dark.webp",
  brandColor: "#4f46e5", brandColorDark: "#8b8cf8", accentColor: "#6366f1", inkColor: "#111827", creamColor: "#f4f6fb", darkColor: "#0c0f1a",
  radius: 16, font: "system", defaultTheme: "light", buttonStyle: "pill", cardStyle: "classic", pack: "default",
  announcements: ["Genuine mobile accessories · Cash on delivery across Pakistan", "Fast chargers, audio and power banks at honest prices"], announcement: "",
  heroText: "Chargers, audio, power and smart accessories, chosen for quality.", footerText: "Premium mobile accessories delivered across Pakistan.",
  navLinks: [],
});
await pool.query("UPDATE site_settings SET value=$1 WHERE key='branding'", [b]);

const col = (icon: string, title: string, text: string) => ({ type: "column", settings: { icon, title, text } });
const sections = sanitizeSections([
  { id: "hero-1", type: "hero", settings: {
    variant: "image", imageUrl: "/cs/mob-hero-wide.webp", imageUrlMobile: "/cs/mob-hero-phone.webp", eyebrow: "AVERIXA Mobiles", heading: "Premium mobile accessories",
    text: "Fast chargers, earbuds, power banks and smart gear.",
    primaryLabel: "Shop now", primaryHref: "/products", secondaryLabel: "Power banks", secondaryHref: "/collections/powerbanks", height: "lg" } },
  { id: "trust-1", type: "trust-strip", settings: {
    title1: "Genuine quality", text1: "Checked before it ships", icon1: "shield",
    title2: "Honest prices", text2: "Clear pricing, no surprises", icon2: "price",
    title3: "Delivery across Pakistan", text3: "Cash on delivery", icon3: "truck" } },
  { id: "cats-1", type: "collection-list", settings: { eyebrow: "Explore", heading: "Shop by category", layout: "bento", count: 8 } },
  { id: "popular-1", type: "product-carousel", settings: { eyebrow: "Best sellers", heading: "Popular right now", count: 12, sort: "popular" } },
  { id: "latest-1", type: "product-carousel", settings: { eyebrow: "Just in", heading: "New arrivals", count: 12, sort: "newest" } },
  { id: "brands-1", type: "brand-grid", settings: { eyebrow: "Brands", heading: "Brands we stock" } },
  { id: "why-1", type: "multicolumn", settings: { heading: "Why AVERIXA Mobiles", columns: "3" }, blocks: [
    col("shield", "Quality checked", "Every accessory is inspected before dispatch."),
    col("cash", "Pay on delivery", "Cash on delivery across Pakistan."),
    col("support", "Friendly support", "Ask us on WhatsApp before you buy."),
  ] },
]);
const old = (await pool.query("SELECT published, draft FROM page_templates WHERE key='home'")).rows[0];
if (old) await pool.query("INSERT INTO template_versions (key, content, label) VALUES ('home', $1, 'Before the mobiles layout')", [old.published ?? old.draft]);
await pool.query(
  `INSERT INTO page_templates (key, title, draft, published, published_at) VALUES ('home', 'Home page', $1, $1, now())
   ON CONFLICT (key) DO UPDATE SET draft = EXCLUDED.draft, published = EXCLUDED.published, published_at = now(), updated_at = now()`,
  [JSON.stringify({ sections })]);
console.log(`mobiles brand and home written: ${sections.map((s) => s.type).join(", ")}`);
await pool.end();
process.exit(0);
