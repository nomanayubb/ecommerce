import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { pool } from "./lib/db.js";

// Dev seed, safe to re-run. Admin is created once (random password printed once);
// set RESET_ADMIN=1 to issue a new admin password.
const admin = (await pool.query("SELECT 1 FROM users WHERE email = 'admin@example.com'")).rowCount;
if (!admin || process.env.RESET_ADMIN) {
  const pw = crypto.randomBytes(9).toString("base64url");
  await pool.query(
    `INSERT INTO users (email, password_hash, role) VALUES ('admin@example.com', $1, 'SUPER_ADMIN')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [await bcrypt.hash(pw, 12)]
  );
  console.log(`admin@example.com / ${pw}`);
} else {
  console.log("admin exists (RESET_ADMIN=1 to issue a new password)");
}

const cat = async (name: string, slug: string, parent: string | null = null, order = 0) =>
  (await pool.query(
    `INSERT INTO categories (name, slug, parent_id, sort_order) VALUES ($1,$2,$3,$4)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [name, slug, parent, order]
  )).rows[0].id as string;

const brand = async (name: string, slug: string) =>
  (await pool.query(
    `INSERT INTO brands (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [name, slug]
  )).rows[0].id as string;

const electronics = await cat("Electronics", "electronics", null, 1);
const phones = await cat("Phones", "phones", electronics);
const laptops = await cat("Laptops", "laptops", electronics);
const audio = await cat("Audio", "audio", electronics);
const fashion = await cat("Fashion", "fashion", null, 2);
const men = await cat("Men", "men", fashion);
const tshirts = await cat("T-Shirts", "t-shirts", men);
const women = await cat("Women", "women", fashion);
const home = await cat("Home & Kitchen", "home-kitchen", null, 3);
const kitchen = await cat("Kitchen", "kitchen", home);

const apex = await brand("Apex", "apex");
const nova = await brand("Nova", "nova");
const urbano = await brand("Urbano", "urbano");

interface P {
  title: string; slug: string; brand: string; cat: string; marked: number; price: number; stock: number;
  moq?: number; tags?: string[]; variants?: [string, Record<string, string>, number][]; tiers?: [number, number][];
  wholesale?: number;
}
const products: P[] = [
  { title: "Apex X1 Smartphone 128GB", slug: "apex-x1", brand: apex, cat: phones, marked: 69999, price: 59999, stock: 40, tags: ["new", "5g"],
    variants: [["Black", { color: "Black" }, 20], ["Blue", { color: "Blue" }, 20]] },
  { title: "Apex X1 Lite 64GB", slug: "apex-x1-lite", brand: apex, cat: phones, marked: 39999, price: 34999, stock: 60 },
  { title: "Nova Pro 15 Laptop", slug: "nova-pro-15", brand: nova, cat: laptops, marked: 189999, price: 169999, stock: 12, tags: ["bestseller"],
    variants: [["8GB / 256GB", { ram: "8GB", storage: "256GB" }, 6], ["16GB / 512GB", { ram: "16GB", storage: "512GB" }, 6]] },
  { title: "Nova Air 13 Ultrabook", slug: "nova-air-13", brand: nova, cat: laptops, marked: 159999, price: 149999, stock: 8 },
  { title: "Apex Buds Wireless Earbuds", slug: "apex-buds", brand: apex, cat: audio, marked: 7999, price: 5999, stock: 150, tags: ["sale"],
    tiers: [[5, 5499], [20, 4999]], wholesale: 4800 },
  { title: "Nova Boom Bluetooth Speaker", slug: "nova-boom", brand: nova, cat: audio, marked: 9999, price: 8499, stock: 3 },
  { title: "Urbano Classic Tee", slug: "urbano-classic-tee", brand: urbano, cat: tshirts, marked: 1999, price: 1499, stock: 200, tags: ["cotton"],
    variants: [["S", { size: "S" }, 50], ["M", { size: "M" }, 70], ["L", { size: "L" }, 60], ["XL", { size: "XL" }, 20]],
    tiers: [[10, 1299], [50, 1099]] },
  { title: "Urbano Graphic Tee", slug: "urbano-graphic-tee", brand: urbano, cat: tshirts, marked: 2499, price: 2499, stock: 90 },
  { title: "Urbano Summer Dress", slug: "urbano-summer-dress", brand: urbano, cat: women, marked: 4999, price: 3999, stock: 35 },
  { title: "Nova Chef Non-Stick Pan Set", slug: "nova-chef-pan-set", brand: nova, cat: kitchen, marked: 6999, price: 5499, stock: 25, moq: 1 },
  { title: "Apex Electric Kettle 1.7L", slug: "apex-kettle", brand: apex, cat: kitchen, marked: 3499, price: 2799, stock: 0 },
  { title: "Bulk Cotton Socks (pack of 12)", slug: "bulk-socks-12", brand: urbano, cat: men, marked: 1800, price: 1500, stock: 500, moq: 2, tiers: [[10, 1300]] },
];

for (const p of products) {
  const id = (await pool.query(
    `INSERT INTO products (title, slug, sku, status, marked_price, selling_price, wholesale_price, brand_id,
                           stock_quantity, moq, images, tags, description)
     VALUES ($1,$2,$3,'PUBLISHED',$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (slug) DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity, selling_price = EXCLUDED.selling_price
     RETURNING id`,
    [p.title, p.slug, p.slug.toUpperCase(), p.marked, p.price, p.wholesale ?? null, p.brand, p.stock, p.moq ?? 1,
     JSON.stringify([`https://picsum.photos/seed/${p.slug}/800/800`, `https://picsum.photos/seed/${p.slug}-2/800/800`]),
     p.tags ?? [], `${p.title}. Sample product for development.`]
  )).rows[0].id;
  await pool.query("INSERT INTO product_categories VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, p.cat]);
  for (const [title, attrs, stock] of p.variants ?? [])
    await pool.query(
      `INSERT INTO product_variants (product_id, title, sku, price, stock_quantity, variant_attributes)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (sku) DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity`,
      [id, title, `${p.slug}-${title}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-"), p.price, stock, JSON.stringify(attrs)]
    );
  for (const [minQty, unit] of p.tiers ?? [])
    await pool.query(
      "INSERT INTO price_tiers (product_id, min_qty, unit_price) VALUES ($1,$2,$3) ON CONFLICT (product_id, min_qty) DO UPDATE SET unit_price = EXCLUDED.unit_price",
      [id, minQty, unit]
    );
}
console.log(`seeded ${products.length} products`);
await pool.end();
