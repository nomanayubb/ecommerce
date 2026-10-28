// Brand and home page of the AUTO PARTS shop (DATABASE_URL = shop_autoparts; refuses any other database): logo, graphite and signal-orange colours, square corners (chamfered by the CSS),
// dark theme by default, announcement strip, and the home layout (hero banner, promises, shop by vehicle, menus, popular parts, new parts, makes, why choose us).
import { pool } from "../src/lib/db.js";
import { sanitizeSections } from "../src/lib/sections.js";

const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/autoparts/.test(db)) throw new Error(`refusing to run on database "${db}" (this look is for the autoparts shop only)`);

const b = (await pool.query("SELECT value FROM site_settings WHERE key='branding'")).rows[0].value;
Object.assign(b, {
  name: "AVERIXA Auto Parts", tagline: "Genuine parts. Guaranteed fit.",
  logoUrl: "/brand/autoparts/logo-horizontal.webp", logoUrlDark: "/brand/autoparts/logo-horizontal-dark.webp",
  brandColor: "#ff5a1f", brandColorDark: "#ff6a2b", accentColor: "#ff5a1f", inkColor: "#14161b", creamColor: "#eceff3", darkColor: "#0d0e11",
  radius: 2, font: "system", defaultTheme: "dark", buttonStyle: "solid", cardStyle: "classic", pack: "default",
  announcements: ["Genuine auto parts and accessories · Cash on delivery across Pakistan", "Find the right part for your car by make and model"], announcement: "",
  heroText: "Parts and accessories for Toyota, Honda, Suzuki, KIA, Hyundai and more.", footerText: "Auto parts and accessories delivered across Pakistan.",
  navLinks: [],
});
await pool.query("UPDATE site_settings SET value=$1 WHERE key='branding'", [b]);

const makes = (await pool.query("SELECT b.name, b.slug FROM brands b JOIN products p ON p.brand_id=b.id GROUP BY b.name, b.slug ORDER BY count(*) DESC LIMIT 10")).rows as { name: string; slug: string }[];
const col = (icon: string, title: string, text: string) => ({ type: "column", settings: { icon, title, text } });
const sections = sanitizeSections([
  { id: "hero-1", type: "hero", settings: {
    variant: "image", imageUrl: "/cs/ap-hero-wide.webp", imageUrlMobile: "/cs/ap-hero-phone.webp", eyebrow: "AVERIXA Auto Parts", heading: "The right part for your car",
    text: "Floor mats, lighting, wipers, covers and more, for the cars on Pakistan's roads.",
    primaryLabel: "Shop parts", primaryHref: "/products", secondaryLabel: "Floor mats", secondaryHref: "/collections/floor-mats", height: "lg" } },
  { id: "chips-1", type: "chips", settings: {}, blocks: makes.map((m) => ({ type: "chip", settings: { label: m.name, href: `/products?tag=${m.slug}` } })) },
  { id: "trust-1", type: "trust-strip", settings: {
    title1: "Genuine quality", text1: "Parts checked before dispatch", icon1: "shield",
    title2: "In stock", text2: "Only what we can ship", icon2: "package",
    title3: "Delivery across Pakistan", text3: "Cash on delivery", icon3: "truck" } },
  { id: "cats-1", type: "collection-list", settings: { eyebrow: "Browse", heading: "Shop by category", layout: "all", count: 8 } },
  { id: "popular-1", type: "product-carousel", settings: { eyebrow: "Best sellers", heading: "Popular parts", count: 12, sort: "popular" } },
  { id: "latest-1", type: "product-carousel", settings: { eyebrow: "Just in", heading: "New arrivals", count: 12, sort: "newest" } },
  { id: "brands-1", type: "brand-grid", settings: { eyebrow: "Vehicles", heading: "Shop by make" } },
  { id: "why-1", type: "multicolumn", settings: { heading: "Why AVERIXA Auto Parts", columns: "3" }, blocks: [
    col("shield", "Genuine quality", "Every part is inspected before it ships."),
    col("cash", "Pay on delivery", "Cash on delivery across Pakistan."),
    col("support", "Fitment help", "Not sure it fits? Ask us on WhatsApp before you buy."),
  ] },
]);
const old = (await pool.query("SELECT published, draft FROM page_templates WHERE key='home'")).rows[0];
if (old) await pool.query("INSERT INTO template_versions (key, content, label) VALUES ('home', $1, 'Before the auto parts layout')", [old.published ?? old.draft]);
await pool.query(
  `INSERT INTO page_templates (key, title, draft, published, published_at) VALUES ('home', 'Home page', $1, $1, now())
   ON CONFLICT (key) DO UPDATE SET draft = EXCLUDED.draft, published = EXCLUDED.published, published_at = now(), updated_at = now()`,
  [JSON.stringify({ sections })]);
console.log(`autoparts brand and home written: ${sections.map((s) => s.type).join(", ")}`);
await pool.end();
process.exit(0);
