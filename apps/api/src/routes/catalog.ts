import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { cached } from "../lib/redis.js";

const listQuery = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z.coerce.boolean().optional(),
  tag: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

const ORDER = {
  newest: "p.created_at DESC",
  price_asc: "p.selling_price ASC",
  price_desc: "p.selling_price DESC",
} as const;

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  // Postgres-backed for now; swap the body for a Typesense query once the index sync worker exists.
  app.get("/products", async (req) => {
    const f = listQuery.parse(req.query);
    const key = `catalog:list:${JSON.stringify(f)}`;
    return cached(key, 60, async () => {
      const where = ["p.status = 'PUBLISHED'"];
      const args: unknown[] = [];
      const add = (sql: string, v: unknown) => { args.push(v); where.push(sql.replace(/\?/g, `$${args.length}`)); };

      if (f.q) add("(p.title ILIKE ? OR p.sku ILIKE ?)", `%${f.q}%`);
      if (f.brand) add("b.slug = ?", f.brand);
      if (f.minPrice != null) add("p.selling_price >= ?", f.minPrice);
      if (f.maxPrice != null) add("p.selling_price <= ?", f.maxPrice);
      if (f.inStock) where.push("p.stock_quantity > 0");
      if (f.tag) add("? = ANY(p.tags)", f.tag);
      if (f.category) {
        add(
          `EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id IN (
             WITH RECURSIVE t AS (
               SELECT id FROM categories WHERE slug = ?
               UNION ALL SELECT c.id FROM categories c JOIN t ON c.parent_id = t.id)
             SELECT id FROM t))`,
          f.category
        );
      }

      const from = `FROM products p LEFT JOIN brands b ON b.id = p.brand_id WHERE ${where.join(" AND ")}`;
      const total = Number((await pool.query(`SELECT count(*) ${from}`, args)).rows[0].count);
      const { rows } = await pool.query(
        `SELECT p.id, p.title, p.slug, p.marked_price, p.selling_price, p.stock_quantity, p.images, p.tags,
                b.name AS brand_name, b.slug AS brand_slug,
                CASE WHEN p.marked_price > p.selling_price
                     THEN round((p.marked_price - p.selling_price) / p.marked_price * 100) END AS discount_pct
         ${from} ORDER BY ${ORDER[f.sort]} LIMIT ${f.pageSize} OFFSET ${(f.page - 1) * f.pageSize}`,
        args
      );
      return { items: rows, page: f.page, pageSize: f.pageSize, total };
    });
  });

  app.get<{ Params: { slug: string } }>("/products/:slug", async (req, reply) => {
    const { rows } = await pool.query(
      `SELECT p.*, b.name AS brand_name, b.slug AS brand_slug FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id WHERE p.slug = $1 AND p.status = 'PUBLISHED'`,
      [req.params.slug]
    );
    const p = rows[0];
    if (!p) return reply.status(404).send({ success: false, error: "Not found" });
    // wholesale_price is only exposed via cart pricing for approved buyers.
    delete p.wholesale_price;
    const [variants, tiers] = await Promise.all([
      pool.query("SELECT id, title, sku, price, stock_quantity, variant_attributes FROM product_variants WHERE product_id = $1", [p.id]),
      pool.query("SELECT min_qty, unit_price FROM price_tiers WHERE product_id = $1 ORDER BY min_qty", [p.id]),
    ]);
    return { ...p, variants: variants.rows, priceTiers: tiers.rows };
  });

  app.get("/categories/tree", async () =>
    cached("catalog:categories:tree", 300, async () => {
      const { rows } = await pool.query(
        "SELECT id, parent_id, name, slug, image_url FROM categories WHERE is_active ORDER BY sort_order, name"
      );
      const byId = new Map<string, any>(rows.map((r) => [r.id, { ...r, children: [] }]));
      const roots: any[] = [];
      for (const n of byId.values()) {
        const parent = n.parent_id && byId.get(n.parent_id);
        (parent ? parent.children : roots).push(n);
      }
      return roots;
    })
  );
};
