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

  // Bulk edit: apply the same change to every product in the collection (or just the chosen ones).
  const bulkSchema = z.object({
    productIds: z.array(z.string().uuid()).max(2000).optional(),
    status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]).optional(),
    price: z.object({ mode: z.enum(["percent", "amount", "set", "discount"]), value: z.number().min(-1_000_000).max(10_000_000), alsoMarked: z.boolean().default(true) }).optional(),
    stock: z.object({ mode: z.enum(["set", "add"]), value: z.number().int().min(-1_000_000).max(1_000_000) }).optional(),
    addTags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(10).optional(),
    removeTags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(10).optional(),
    showAddToCart: z.boolean().optional(),
    showBuyNow: z.boolean().optional(),
    showAddress: z.boolean().optional(),
  });
  async function runBulk(collectionId: string | null, b: z.infer<typeof bulkSchema>) {
    const c = await pool.connect();
    let changed = 0;
    try {
      await c.query("BEGIN");
      const base = collectionId
        ? { sql: `SELECT p.id, p.marked_price, p.selling_price, p.stock_quantity, p.tags, p.metafields FROM product_categories pc JOIN products p ON p.id = pc.product_id WHERE pc.category_id = $1 FOR UPDATE OF p`, args: [collectionId] }
        : { sql: `SELECT p.id, p.marked_price, p.selling_price, p.stock_quantity, p.tags, p.metafields FROM products p FOR UPDATE OF p`, args: [] as string[] };
      const rows = (await c.query(base.sql, base.args)).rows.filter((r) => !b.productIds || b.productIds.includes(r.id));
      for (const r of rows) {
        let marked = Number(r.marked_price), sell = Number(r.selling_price), stock = r.stock_quantity as number;
        let factor: ((n: number) => number) | null = null;
        if (b.price) {
          const v = b.price.value;
          if (b.price.mode === "percent") factor = (n) => n * (1 + v / 100);
          else if (b.price.mode === "amount") factor = (n) => n + v;
          else if (b.price.mode === "set") sell = v;
          else sell = marked * (1 - v / 100);
          if (factor) { sell = factor(sell); if (b.price.alsoMarked) marked = factor(marked); }
          sell = Math.max(0, Math.round(sell));
          marked = Math.max(0, Math.round(marked));
          if (sell > marked) marked = sell;
        }
        if (b.stock) stock = Math.max(0, b.stock.mode === "set" ? b.stock.value : stock + b.stock.value);
        let tags: string[] = r.tags ?? [];
        if (b.addTags?.length) tags = [...new Set([...tags, ...b.addTags])];
        if (b.removeTags?.length) tags = tags.filter((t) => !b.removeTags!.includes(t));
        const meta = { ...(r.metafields ?? {}) } as Record<string, unknown>;
        for (const k of ["showAddToCart", "showBuyNow", "showAddress"] as const) if (b[k] !== undefined) meta[k] = b[k];
        await c.query(
          "UPDATE products SET status = COALESCE($2, status), marked_price = $3, selling_price = $4, stock_quantity = $5, tags = $6, metafields = $7, updated_at = now() WHERE id = $1",
          [r.id, b.status ?? null, marked, sell, stock, tags, JSON.stringify(meta)]
        );
        if (b.price && (b.price.mode === "percent" || b.price.mode === "amount")) {
          const v = b.price.value;
          await c.query(
            b.price.mode === "percent" ? "UPDATE product_variants SET price = GREATEST(0, round(price * (1 + $2::numeric / 100))) WHERE product_id = $1" : "UPDATE product_variants SET price = GREATEST(0, round(price + $2::numeric)) WHERE product_id = $1",
            [r.id, v]
          );
        }
        changed++;
      }
      await c.query("COMMIT");
    } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
    await delPattern("catalog:*");
    return { ok: true, changed };
  }
  app.post<{ Params: { id: string } }>("/collections/:id/bulk", { preHandler: writer }, async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    return runBulk(req.params.id, bulkSchema.parse(req.body));
  });
  // Same edit across every product in the shop (or the chosen ones).
  app.post("/products/bulk-edit", { preHandler: writer }, async (req) => runBulk(null, bulkSchema.parse(req.body)));

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
