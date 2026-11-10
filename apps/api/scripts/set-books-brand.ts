// Brand and home page of the BOOKS shop (DATABASE_URL = shop_books; refuses any other database), copied from the owner's barkatbooks.com:
// cream page, deep maroon text, crimson buttons, the "11.11 Sale" strip, and the home layout (banner, "Sale 75% off" row, "Trending Collections").
import { pool } from "../src/lib/db.js";
import { sanitizeSections } from "../src/lib/sections.js";

const db = (await pool.query("SELECT current_database() d")).rows[0].d as string;
if (!/books/.test(db)) throw new Error(`refusing to run on database "${db}" (this look is for the books shop only)`);

const b = (await pool.query("SELECT value FROM site_settings WHERE key='branding'")).rows[0].value;
Object.assign(b, {
  name: "AVERIXA Books", tagline: "Buy Books on Discount", logoUrl: "", logoUrlDark: "",
  brandColor: "#910f3f", brandColorDark: "#c4366a", accentColor: "#910f3f", inkColor: "#3d081b", creamColor: "#f2efdd", darkColor: "#240510",
  radius: 10, font: "system", defaultTheme: "light", buttonStyle: "solid", cardStyle: "classic", pack: "default",
  announcements: ["11.11 Sale live 70% Off!"], announcement: "",
  heroText: "Buy books on discount: English, Urdu, kids, Islamic and exam books, delivered across Pakistan.", footerText: "AVERIXA Books: books on discount, delivered across Pakistan.",
  navLinks: [],
});
await pool.query("UPDATE site_settings SET value=$1 WHERE key='branding'", [b]);

const sections = sanitizeSections([
  { id: "banner-1", type: "image-banner", settings: { imageUrl: "/bk/hero-wide.webp", alt: "11.11 Big Sale, up to 75% off", href: "/collections/sales-3" } },
  { id: "sale-1", type: "product-carousel", settings: { eyebrow: "", heading: "Sale 75% off", categorySlug: "sales-3", count: 12, sort: "newest" } },
  { id: "trend-1", type: "collection-list", settings: { eyebrow: "", heading: "Trending Collections", layout: "bento", count: 6, slugs: "english,urdu-books,childerss-books,sales-2,islamic-books,sales" } },
]);
const old = (await pool.query("SELECT published, draft FROM page_templates WHERE key='home'")).rows[0];
if (old) await pool.query("INSERT INTO template_versions (key, content, label) VALUES ('home', $1, 'Before the books layout')", [old.published ?? old.draft]);
await pool.query(
  `INSERT INTO page_templates (key, title, draft, published, published_at) VALUES ('home', 'Home page', $1, $1, now())
   ON CONFLICT (key) DO UPDATE SET draft = EXCLUDED.draft, published = EXCLUDED.published, published_at = now(), updated_at = now()`,
  [JSON.stringify({ sections })]);
console.log(`books brand and home written: ${sections.map((s) => s.type).join(", ")}`);
await pool.end();
process.exit(0);
