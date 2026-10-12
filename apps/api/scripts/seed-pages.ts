// Creates starter pages (FAQ, Contact) if they do not exist yet, using the shop's real delivery rules. Safe to re-run: never overwrites.
// Usage: npx tsx scripts/seed-pages.ts   (then edit them in admin > Pages)
import { pool } from "../src/lib/db.js";
import { sanitizeSections } from "../src/lib/sections.js";

const { rows } = await pool.query("SELECT value FROM site_settings WHERE key = 'store'");
const store = { freeShippingThreshold: 5000, shippingFee: 250, ...(rows[0]?.value ?? {}) };
const pkr = (n: number) => `Rs. ${Number(n).toLocaleString("en-PK")}`;
const q = (question: string, answer: string) => ({ settings: { question, answer } });

const pages: Record<string, { title: string; sections: unknown[] }> = {
  "page:faq": {
    title: "Questions and answers",
    sections: [
      { type: "rich-text", settings: { eyebrow: "Help", heading: "Questions and answers", body: "Quick answers about ordering, delivery and payment. Cannot find yours? Use the contact page and we will reply by email." } },
      { type: "faq", settings: { eyebrow: "Delivery", heading: "Delivery and tracking" }, blocks: [
        q("How much does delivery cost?", store.freeShippingThreshold > 0 ? `Delivery is ${pkr(store.shippingFee)}. Orders of ${pkr(store.freeShippingThreshold)} or more are delivered free.` : "Delivery is free."),
        q("How can I track my order?", "Open the Track your order page and enter your order number and the phone number you used at checkout. If you have an account, your orders and their progress are also under My account."),
        q("Do you deliver across Pakistan?", "Yes. Enter your city at checkout and we show the estimated delivery time on each product page."),
      ] },
      { type: "faq", settings: { eyebrow: "Payment", heading: "Payment and accounts" }, blocks: [
        q("Can I pay cash on delivery?", "Yes. Pay the courier in cash when your order arrives. More payment methods will be added later."),
        q("Do I need an account to order?", "No. You can check out as a guest. An account lets you see your order history, save addresses and keep a wishlist across visits."),
        q("Is my information safe?", "We only ask for what is needed to deliver your order. Your bag and wishlist stay on your device until you place an order."),
      ] },
    ],
  },
  "page:contact": {
    title: "Contact",
    sections: [{ type: "contact", settings: { eyebrow: "Contact", heading: "Get in touch", intro: "Questions about an order or a product? Send us a message and we will reply by email.", showForm: true } }],
  },
};

for (const [key, p] of Object.entries(pages)) {
  const exists = (await pool.query("SELECT 1 FROM page_templates WHERE key = $1", [key])).rowCount;
  if (exists) { console.log(`${key}: already exists, left alone`); continue; }
  const sections = sanitizeSections(p.sections.map((s: any, i) => ({ ...s, id: `${s.type}-${i}`, enabled: true })));
  const draft = { sections };
  await pool.query("INSERT INTO page_templates (key, title, draft, published, seo, published_at) VALUES ($1, $2, $3, $3, '{}'::jsonb, now())", [key, p.title, JSON.stringify(draft)]);
  console.log(`${key}: created and published`);
}
await pool.end();
