import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { delPattern } from "../lib/redis.js";
import { fileKey } from "./uploads.js";

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const row = z.object({
  title: z.string().trim().min(1).max(200),
  sku: z.string().trim().min(1).max(60),
  sellingPrice: z.number().nonnegative(),
  markedPrice: z.number().nonnegative().nullish(),
  stock: z.number().int().min(0).default(0),
  brand: z.string().trim().max(80).default(""),
  collections: z.array(z.string().trim().min(1)).max(20).default([]),
  description: z.string().max(10000).default(""),
  tags: z.array(z.string().trim().toLowerCase().max(40)).max(30).default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(170).default(""),
  images: z.array(z.string().trim().min(1)).max(20).default([]),
  moq: z.number().int().min(1).default(1),
});

/** Creates products from a spreadsheet's rows (new SKU = create, known SKU = update). Pictures are matched by file name. */
export const importAdminRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/products/import",
    { bodyLimit: 8 * 1024 * 1024, preHandler: async (req: any, reply: any) => { if (req.user.role === "WAREHOUSE") return reply.status(403).send({ success: false, error: "Forbidden" }); } },
    async (req) => {
      const { rows } = z.object({ rows: z.array(z.unknown()).min(1).max(500) }).parse(req.body);
      const cats = (await pool.query("SELECT id, name, slug FROM categories")).rows as { id: string; name: string; slug: string }[];
      const catBy = new Map<string, string>();
      for (const c of cats) { catBy.set(c.slug, c.id); if (!catBy.has(c.name.toLowerCase())) catBy.set(c.name.toLowerCase(), c.id); }
      const have = new Set((await pool.query("SELECT name FROM uploads")).rows.map((r) => r.name as string));
      const results: { row: number; status: "created" | "updated" | "error"; message: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const parsed = row.safeParse(rows[i]);
        if (!parsed.success) { results.push({ row: i + 1, status: "error", message: parsed.error.issues[0]?.message ?? "Invalid row" }); continue; }
        const r = parsed.data;
        const c = await pool.connect();
        try {
          const catIds: string[] = [];
          for (const name of r.collections) {
            const id = catBy.get(name.toLowerCase()) ?? catBy.get(slugify(name));
            if (!id) throw new Error(`Collection not found: ${name}`);
            catIds.push(id);
          }
          const images = r.images.map((im) => {
            if (/^(https?:)?\/\//i.test(im) || im.startsWith("/")) return im;
            const k = fileKey(im);
            if (!have.has(k)) throw new Error(`Picture not uploaded: ${im}`);
            return `/uploads/${k}`;
          });
          await c.query("BEGIN");
          let brandId: string | null = null;
          if (r.brand) {
            brandId = (await c.query("INSERT INTO brands (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name = brands.name RETURNING id", [r.brand, slugify(r.brand)])).rows[0].id;
          }
          const marked = Math.max(r.markedPrice ?? r.sellingPrice, r.sellingPrice);
          const existing = (await c.query("SELECT id, metafields FROM products WHERE sku = $1", [r.sku])).rows[0];
          const meta = { ...(existing?.metafields ?? {}), ...(r.seoTitle ? { seoTitle: r.seoTitle } : {}), ...(r.seoDescription ? { seoDescription: r.seoDescription } : {}) };
          let id: string;
          let status: "created" | "updated";
          if (existing) {
            id = existing.id; status = "updated";
            await c.query(
              `UPDATE products SET title=$2, description=$3, status=$4, marked_price=$5, selling_price=$6, brand_id=COALESCE($7, brand_id), stock_quantity=$8, moq=$9,
                 images=CASE WHEN $10::text = '[]' THEN images ELSE $10::jsonb END, tags=$11, metafields=$12, updated_at=now() WHERE id=$1`,
              [id, r.title, r.description || null, r.status, marked, r.sellingPrice, brandId, r.stock, r.moq, JSON.stringify(images), r.tags, JSON.stringify(meta)]
            );
          } else {
            let slug = slugify(r.title) || "product";
            for (let n = 2; (await c.query("SELECT 1 FROM products WHERE slug = $1", [slug])).rowCount; n++) slug = `${slugify(r.title)}-${n}`;
            id = (await c.query(
              `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, brand_id, stock_quantity, moq, images, tags, metafields)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
              [r.title, slug, r.sku, r.description || null, r.status, marked, r.sellingPrice, brandId, r.stock, r.moq, JSON.stringify(images), r.tags, JSON.stringify(meta)]
            )).rows[0].id;
            status = "created";
          }
          if (catIds.length) {
            await c.query("DELETE FROM product_categories WHERE product_id = $1", [id]);
            for (const cid of new Set(catIds)) await c.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, cid]);
          }
          await c.query("COMMIT");
          results.push({ row: i + 1, status, message: r.title });
        } catch (e: any) {
          await c.query("ROLLBACK").catch(() => {});
          results.push({ row: i + 1, status: "error", message: e?.message ?? "Failed" });
        } finally { c.release(); }
      }
      await delPattern("catalog:*");
      return { results, created: results.filter((x) => x.status === "created").length, updated: results.filter((x) => x.status === "updated").length, errors: results.filter((x) => x.status === "error").length };
    }
  );
};
