import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { delPattern } from "../lib/redis.js";

/** Collections = the shop's categories: a named group of products shown on the storefront. Admin CRUD plus product membership. */
const url = z.string().trim().max(500).refine((v) => v === "" || /^(https?:\/\/|\/)/i.test(v), "Use a web address or a /path").default("");
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const body = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).default(""),
  description: z.string().trim().max(2000).default(""),
  imageUrl: url,
  parentId: z.string().uuid().nullish().transform((v) => v ?? null),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});
const isId = (id: string) => /^[0-9a-f-]{36}$/.test(id);

export const collectionAdminRoutes: FastifyPluginAsync = async (app) => {
  const writer = async (req: any, reply: any) => {
    if (req.user.role === "WAREHOUSE") return reply.status(403).send({ success: false, error: "Forbidden" });
  };
  const clash = (e: any, reply: any) => {
    if (e?.code === "23505") return reply.status(409).send({ success: false, error: "That address is already used by another collection" });
    throw e;
  };

  app.get("/collections", async () =>
    (await pool.query(
      `SELECT c.id, c.name, c.slug, c.description, c.image_url, c.parent_id, c.is_active, c.sort_order,
              (SELECT count(*)::int FROM product_categories pc WHERE pc.category_id = c.id) AS product_count
         FROM categories c ORDER BY c.sort_order, c.name`
    )).rows
  );

  app.post("/collections", { preHandler: writer }, async (req, reply) => {
    const b = body.parse(req.body);
    const slug = slugify(b.slug || b.name);
    if (!slug) return reply.status(400).send({ success: false, error: "Give the collection a name" });
    try {
      const r = await pool.query(
        "INSERT INTO categories (name, slug, description, image_url, parent_id, is_active, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        [b.name, slug, b.description || null, b.imageUrl || null, b.parentId, b.isActive, b.sortOrder]
      );
      await delPattern("catalog:*");
      return reply.status(201).send({ id: r.rows[0].id });
    } catch (e) { return clash(e, reply); }
  });

  app.get<{ Params: { id: string } }>("/collections/:id", async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    const c = (await pool.query("SELECT id, name, slug, description, image_url, parent_id, is_active, sort_order FROM categories WHERE id = $1", [req.params.id])).rows[0];
    if (!c) return reply.status(404).send({ success: false, error: "Not found" });
    const products = (await pool.query(
      `SELECT p.id, p.title, p.slug, p.status, p.images[1] AS image, p.selling_price, p.stock_quantity
         FROM product_categories pc JOIN products p ON p.id = pc.product_id WHERE pc.category_id = $1 ORDER BY p.title`, [c.id]
    )).rows;
    return { ...c, products };
  });

  app.put<{ Params: { id: string } }>("/collections/:id", { preHandler: writer }, async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    const b = body.parse(req.body);
    const slug = slugify(b.slug || b.name);
    if (!slug) return reply.status(400).send({ success: false, error: "Give the collection a name" });
    if (b.parentId === req.params.id) return reply.status(400).send({ success: false, error: "A collection cannot sit inside itself" });
    try {
      const r = await pool.query(
        "UPDATE categories SET name=$2, slug=$3, description=$4, image_url=$5, parent_id=$6, is_active=$7, sort_order=$8 WHERE id=$1",
        [req.params.id, b.name, slug, b.description || null, b.imageUrl || null, b.parentId, b.isActive, b.sortOrder]
      );
      if (!r.rowCount) return reply.status(404).send({ success: false, error: "Not found" });
      await delPattern("catalog:*");
      return { ok: true };
    } catch (e) { return clash(e, reply); }
  });

  app.delete<{ Params: { id: string } }>("/collections/:id", { preHandler: writer }, async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    await pool.query("DELETE FROM categories WHERE id = $1", [req.params.id]);
    await delPattern("catalog:*");
    return { ok: true };
  });

  // Replace the whole product list of a collection in one go.
  app.put<{ Params: { id: string } }>("/collections/:id/products", { preHandler: writer }, async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    const { productIds } = z.object({ productIds: z.array(z.string().uuid()).max(2000) }).parse(req.body);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("DELETE FROM product_categories WHERE category_id = $1", [req.params.id]);
      for (const pid of new Set(productIds)) await c.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [pid, req.params.id]);
      await c.query("COMMIT");
    } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
    await delPattern("catalog:*");
    return { ok: true, count: new Set(productIds).size };
  });
};
