import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { delPattern } from "../lib/redis.js";

const url = z.string().trim().max(500).refine((v) => v === "" || /^\/[^\s]*$/.test(v) || /^https?:\/\/[^\s]+$/.test(v), "Use /path or https:// address");

/**
 * Optional rich content stored in products.metafields. Every key is optional; anything else in metafields is kept as is.
 * The storefront reads exactly these keys (see components/PdpExtras.tsx and Gallery.tsx).
 */
export const metaSchema = z.object({
  videoUrl: url.default(""),
  spinImages: z.array(url).max(72).default([]),
  sizeGuide: z.object({
    note: z.string().trim().max(400).default(""),
    columns: z.array(z.string().trim().max(30)).min(2).max(8),
    rows: z.array(z.array(z.string().trim().max(30)).min(1).max(8)).min(1).max(30),
  }).nullish().transform((v) => v ?? null),
  specs: z.array(z.object({ label: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(200) })).max(25).default([]),
  care: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  material: z.string().trim().max(60).default(""),
  materialNote: z.string().trim().max(500).default(""),
});

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  sku: z.string().min(1).max(100),
  price: z.number().nonnegative(),
  stockQuantity: z.number().int().min(0),
  attributes: z.record(z.string().max(60)).default({}),
  imageIndex: z.number().int().min(0).nullish().transform((v) => v ?? null),
});

const editSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  sku: z.string().min(1).max(100),
  description: z.string().max(10000).nullish().transform((v) => v ?? null),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  markedPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  wholesalePrice: z.number().nonnegative().nullish().transform((v) => v ?? null),
  brandId: z.string().uuid().nullish().transform((v) => v ?? null),
  stockQuantity: z.number().int().min(0),
  moq: z.number().int().min(1),
  images: z.array(url).max(20),
  tags: z.array(z.string().trim().toLowerCase().max(40)).max(30),
  model3dUrl: url.default(""),
  meta: metaSchema,
  categoryIds: z.array(z.string().uuid()).max(20),
  variants: z.array(variantSchema).max(100),
  priceTiers: z.array(z.object({ minQty: z.number().int().min(2), unitPrice: z.number().nonnegative() })).max(10),
});

export const productAdminRoutes: FastifyPluginAsync = async (app) => {
  const writer = async (req: any, reply: any) => {
    if (req.user.role === "WAREHOUSE") return reply.status(403).send({ success: false, error: "Forbidden" });
  };
  const isId = (id: string) => /^[0-9a-f-]{36}$/.test(id);

  app.get("/brands", async () => (await pool.query("SELECT id, name FROM brands ORDER BY name")).rows);

  app.get<{ Params: { id: string } }>("/products/:id", async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    const p = (await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id])).rows[0];
    if (!p) return reply.status(404).send({ success: false, error: "Not found" });
    const [cats, variants, tiers] = await Promise.all([
      pool.query("SELECT category_id FROM product_categories WHERE product_id = $1", [p.id]),
      pool.query("SELECT id, title, sku, price, stock_quantity, variant_attributes, image_index FROM product_variants WHERE product_id = $1 ORDER BY created_at, title", [p.id]),
      pool.query("SELECT min_qty, unit_price FROM price_tiers WHERE product_id = $1 ORDER BY min_qty", [p.id]),
    ]);
    const meta = metaSchema.safeParse(p.metafields ?? {});
    return {
      id: p.id, title: p.title, slug: p.slug, sku: p.sku, description: p.description, status: p.status,
      markedPrice: Number(p.marked_price), sellingPrice: Number(p.selling_price), wholesalePrice: p.wholesale_price == null ? null : Number(p.wholesale_price),
      brandId: p.brand_id, stockQuantity: p.stock_quantity, moq: p.moq, images: p.images ?? [], tags: p.tags ?? [], model3dUrl: p.model_3d_url ?? "",
      meta: meta.success ? meta.data : metaSchema.parse({}),
      categoryIds: cats.rows.map((r) => r.category_id),
      variants: variants.rows.map((v) => ({ id: v.id, title: v.title, sku: v.sku, price: Number(v.price), stockQuantity: v.stock_quantity, attributes: v.variant_attributes ?? {}, imageIndex: v.image_index })),
      priceTiers: tiers.rows.map((t) => ({ minQty: t.min_qty, unitPrice: Number(t.unit_price) })),
    };
  });

  app.put<{ Params: { id: string } }>("/products/:id", { preHandler: writer }, async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    const b = editSchema.parse(req.body);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const cur = (await c.query("SELECT metafields FROM products WHERE id = $1 FOR UPDATE", [req.params.id])).rows[0];
      if (!cur) { await c.query("ROLLBACK"); return reply.status(404).send({ success: false, error: "Not found" }); }
      // Keep unknown metafield keys; replace the ones this editor owns.
      const metafields = { ...(cur.metafields ?? {}), ...b.meta };
      await c.query(
        `UPDATE products SET title=$2, slug=$3, sku=$4, description=$5, status=$6, marked_price=$7, selling_price=$8, wholesale_price=$9,
           brand_id=$10, stock_quantity=$11, moq=$12, images=$13, tags=$14, metafields=$15, model_3d_url=$16, updated_at=now() WHERE id=$1`,
        [req.params.id, b.title, b.slug, b.sku, b.description, b.status, b.markedPrice, b.sellingPrice, b.wholesalePrice, b.brandId,
         b.stockQuantity, b.moq, JSON.stringify(b.images), b.tags, JSON.stringify(metafields), b.model3dUrl || null]
      );
      await c.query("DELETE FROM product_categories WHERE product_id = $1", [req.params.id]);
      for (const cid of b.categoryIds) await c.query("INSERT INTO product_categories VALUES ($1,$2)", [req.params.id, cid]);

      // Variants: update the ones we know by id, add new ones, drop removed ones (old orders keep their text lines).
      const keep: string[] = [];
      for (const v of b.variants) {
        if (v.id) {
          const r = await c.query(
            `UPDATE product_variants SET title=$3, sku=$4, price=$5, stock_quantity=$6, variant_attributes=$7, image_index=$8 WHERE id=$1 AND product_id=$2 RETURNING id`,
            [v.id, req.params.id, v.title, v.sku, v.price, v.stockQuantity, JSON.stringify(v.attributes), v.imageIndex]
          );
          if (r.rowCount) { keep.push(v.id); continue; }
        }
        const ins = await c.query(
          `INSERT INTO product_variants (product_id,title,sku,price,stock_quantity,variant_attributes,image_index) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [req.params.id, v.title, v.sku, v.price, v.stockQuantity, JSON.stringify(v.attributes), v.imageIndex]
        );
        keep.push(ins.rows[0].id);
      }
      await c.query("DELETE FROM product_variants WHERE product_id = $1 AND id <> ALL($2::uuid[])", [req.params.id, keep]);
      await c.query("DELETE FROM price_tiers WHERE product_id = $1", [req.params.id]);
      for (const t of b.priceTiers) await c.query("INSERT INTO price_tiers (product_id,min_qty,unit_price) VALUES ($1,$2,$3)", [req.params.id, t.minQty, t.unitPrice]);
      await c.query("COMMIT");
      await delPattern("catalog:*");
      return { success: true };
    } catch (e: any) {
      await c.query("ROLLBACK");
      if (e.code === "23505") return reply.status(409).send({ success: false, error: "Slug or SKU already exists" });
      throw e;
    } finally {
      c.release();
    }
  });

  // Archive instead of delete: orders and reviews keep pointing at the product.
  app.delete<{ Params: { id: string } }>("/products/:id", { preHandler: writer }, async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    await pool.query("UPDATE products SET status = 'ARCHIVED', updated_at = now() WHERE id = $1", [req.params.id]);
    await delPattern("catalog:*");
    return { success: true };
  });
};
