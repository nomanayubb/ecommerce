import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { cached, delPattern } from "../lib/redis.js";
import { brandingSchema, footerSchema, saveBranding, saveFooter, saveStore, storeSchema } from "./settings.js";
import { templateAdminRoutes } from "./templates.js";
import { couponAdminRoutes } from "./coupons.js";
import { productAdminRoutes } from "./productsAdmin.js";
import { qaAdminRoutes } from "./qa.js";

const STAFF = new Set(["SUPER_ADMIN", "ADMIN", "WAREHOUSE"]);

const productSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  sku: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  markedPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  wholesalePrice: z.number().nonnegative().nullish(),
  brandId: z.string().uuid().nullish(),
  stockQuantity: z.number().int().min(0).default(0),
  moq: z.number().int().min(1).default(1),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  metafields: z.record(z.unknown()).default({}),
  categoryIds: z.array(z.string().uuid()).default([]),
  variants: z
    .array(z.object({
      title: z.string(), sku: z.string(), price: z.number().nonnegative(),
      stockQuantity: z.number().int().min(0), attributes: z.record(z.string()),
    }))
    .default([]),
  priceTiers: z.array(z.object({ minQty: z.number().int().min(2), unitPrice: z.number().nonnegative() })).default([]),
});

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ success: false, error: "Unauthorized" });
    }
    if (!STAFF.has(req.user.role)) return reply.status(403).send({ success: false, error: "Forbidden" });
  });

  const adminOnly = async (req: any, reply: any) => {
    if (req.user.role === "WAREHOUSE") return reply.status(403).send({ success: false, error: "Forbidden" });
  };

  await app.register(templateAdminRoutes);
  await app.register(couponAdminRoutes);
  await app.register(productAdminRoutes);
  await app.register(qaAdminRoutes);

  app.post("/products", { preHandler: adminOnly }, async (req, reply) => {
    const b = productSchema.parse(req.body);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const p = (
        await c.query(
          `INSERT INTO products (title, slug, sku, description, status, marked_price, selling_price, wholesale_price,
                                 brand_id, stock_quantity, moq, images, tags, metafields)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
          [b.title, b.slug, b.sku, b.description, b.status, b.markedPrice, b.sellingPrice, b.wholesalePrice ?? null,
           b.brandId ?? null, b.stockQuantity, b.moq, JSON.stringify(b.images), b.tags, JSON.stringify(b.metafields)]
        )
      ).rows[0];
      for (const cid of b.categoryIds)
        await c.query("INSERT INTO product_categories VALUES ($1,$2)", [p.id, cid]);
      for (const v of b.variants)
        await c.query(
          "INSERT INTO product_variants (product_id,title,sku,price,stock_quantity,variant_attributes) VALUES ($1,$2,$3,$4,$5,$6)",
          [p.id, v.title, v.sku, v.price, v.stockQuantity, JSON.stringify(v.attributes)]
        );
      for (const t of b.priceTiers)
        await c.query("INSERT INTO price_tiers (product_id,min_qty,unit_price) VALUES ($1,$2,$3)", [p.id, t.minQty, t.unitPrice]);
      await c.query("COMMIT");
      await delPattern("catalog:*");
      return reply.status(201).send({ id: p.id });
    } catch (e: any) {
      await c.query("ROLLBACK");
      if (e.code === "23505") return reply.status(409).send({ success: false, error: "Slug or SKU already exists" });
      throw e;
    } finally {
      c.release();
    }
  });

  app.get("/products", async (req) => {
    const q = z.object({
      q: z.string().optional(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
    }).parse(req.query);
    const { rows } = await pool.query(
      `SELECT id, title, slug, sku, status, marked_price, selling_price, stock_quantity, images
       FROM products
       WHERE ($1::text IS NULL OR title ILIKE '%' || $1 || '%' OR sku ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR status = $2)
       ORDER BY created_at DESC LIMIT 100 OFFSET $3`,
      [q.q ?? null, q.status ?? null, (q.page - 1) * 100]
    );
    return rows;
  });

  app.put("/products/bulk", async (req) => {
    const { updates } = z
      .object({
        updates: z.array(z.object({
          id: z.string().uuid(),
          sellingPrice: z.number().nonnegative().optional(),
          stockQuantity: z.number().int().min(0).optional(),
          status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
        })).min(1).max(1000),
      })
      .parse(req.body);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      for (const u of updates)
        await c.query(
          `UPDATE products SET selling_price = COALESCE($2, selling_price),
             stock_quantity = COALESCE($3, stock_quantity), status = COALESCE($4, status), updated_at = now()
           WHERE id = $1`,
          [u.id, u.sellingPrice, u.stockQuantity, u.status]
        );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
    await delPattern("catalog:*");
    return { updated: updates.length };
  });

  app.put("/settings", { preHandler: adminOnly }, async (req) => {
    const b = brandingSchema.parse(req.body);
    await saveBranding(b);
    return { branding: b };
  });

  app.put("/footer-settings", { preHandler: adminOnly }, async (req) => {
    const f = footerSchema.parse(req.body);
    await saveFooter(f);
    return { footer: f };
  });

  app.put("/store-settings", { preHandler: adminOnly }, async (req) => {
    const s = storeSchema.parse(req.body);
    await saveStore(s);
    return { store: s };
  });

  app.get("/orders", async (req) => {
    const q = z.object({
      status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
    }).parse(req.query);
    const { rows } = await pool.query(
      `SELECT id, order_number, user_id, grand_total, order_status, payment_status, payment_method, created_at
       FROM orders WHERE ($1::order_status IS NULL OR order_status = $1)
       ORDER BY created_at DESC LIMIT 50 OFFSET $2`,
      [q.status ?? null, (q.page - 1) * 50]
    );
    return rows;
  });

  // Everything needed to pack and ship one order.
  app.get<{ Params: { id: string } }>("/orders/:id", async (req, reply) => {
    if (!/^[0-9a-f-]{36}$/.test(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    const o = (await pool.query(
      `SELECT o.id, o.order_number, o.grand_total, o.subtotal, o.discount_total, o.shipping_fee, o.gift_wrap_fee, o.coupon_code, o.gift_wrap, o.gift_message,
              o.notes, o.shipping_address, o.order_status, o.payment_status, o.payment_method, o.created_at, u.email AS customer_email
       FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.id = $1`, [req.params.id])).rows[0];
    if (!o) return reply.status(404).send({ success: false, error: "Not found" });
    const items = (await pool.query("SELECT title, sku, unit_price, quantity, total_price FROM order_items WHERE order_id = $1 ORDER BY title", [req.params.id])).rows;
    return { ...o, items };
  });

  app.patch<{ Params: { id: string } }>("/orders/:id/status", async (req, reply) => {
    const { status } = z
      .object({ status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"]) })
      .parse(req.body);
    const r = await pool.query("UPDATE orders SET order_status = $2, updated_at = now() WHERE id = $1 RETURNING id", [
      req.params.id,
      status,
    ]);
    if (!r.rowCount) return reply.status(404).send({ success: false, error: "Order not found" });
    // TODO: tracking SMS once an SMS provider is chosen.
    return { id: r.rows[0].id, status };
  });

  // ---- review moderation
  app.get("/reviews", async (req) => {
    const q = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional() }).parse(req.query);
    return (await pool.query(
      `SELECT r.id, r.rating, r.title, r.body, r.verified, r.status, r.helpful_count, r.created_at, p.title AS product_title, p.slug AS product_slug,
              coalesce(u.first_name || ' ' || u.last_name, u.email) AS author, u.email
       FROM reviews r JOIN products p ON p.id = r.product_id JOIN users u ON u.id = r.user_id
       WHERE ($1::text IS NULL OR r.status = $1) ORDER BY (r.status = 'PENDING') DESC, r.created_at DESC LIMIT 200`, [q.status ?? null])).rows;
  });

  app.patch<{ Params: { id: string } }>("/reviews/:id", { preHandler: adminOnly }, async (req, reply) => {
    const { status } = z.object({ status: z.enum(["APPROVED", "REJECTED", "PENDING"]) }).parse(req.body);
    const r = await pool.query("UPDATE reviews SET status = $2 WHERE id = $1 RETURNING id", [z.string().uuid().parse(req.params.id), status]);
    if (!r.rowCount) return reply.status(404).send({ success: false, error: "Review not found" });
    await delPattern("catalog:*"); // ratings are part of cached catalog lists
    return { id: r.rows[0].id, status };
  });

  app.get("/analytics/summary", async () =>
    cached("admin:analytics:summary", 30, async () => {
      const { rows } = await pool.query(
        `SELECT count(*) AS orders,
                coalesce(sum(grand_total) FILTER (WHERE order_status <> 'CANCELED'), 0) AS revenue,
                coalesce(avg(grand_total) FILTER (WHERE order_status <> 'CANCELED'), 0) AS aov
         FROM orders WHERE created_at > now() - interval '30 days'`
      );
      return rows[0];
    })
  );
};
