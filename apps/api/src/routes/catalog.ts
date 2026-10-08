import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { cached } from "../lib/redis.js";

const csv = z.string().optional().transform((v) => (v ? v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20) : []));
const listQuery = z.object({
  q: z.string().optional(),
  category: csv,
  brand: csv,
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  onSale: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  tag: csv,
  sort: z.enum(["newest", "price_asc", "price_desc", "popular", "rating", "discount", "name"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});
type Filters = z.infer<typeof listQuery>;

const RATING_COUNT = "(SELECT count(*)::int FROM reviews rv WHERE rv.product_id = p.id AND rv.status = 'APPROVED')";
const RATING_AVG = "(SELECT coalesce(avg(rv.rating), 0) FROM reviews rv WHERE rv.product_id = p.id AND rv.status = 'APPROVED')";
const DISCOUNT = "CASE WHEN p.marked_price > p.selling_price THEN (p.marked_price - p.selling_price) / p.marked_price ELSE 0 END";
const ORDER = {
  newest: "p.created_at DESC",
  price_asc: "p.selling_price ASC",
  price_desc: "p.selling_price DESC",
  popular: `${RATING_COUNT} DESC, p.created_at DESC`,
  rating: `${RATING_AVG} DESC, ${RATING_COUNT} DESC`,
  discount: `${DISCOUNT} DESC, p.created_at DESC`,
  name: "p.title ASC",
} as const;

/** WHERE clause for the filters. `skip` leaves one facet out so its own counts stay useful (standard faceting). */
function buildWhere(f: Filters, skip?: "brand" | "tag" | "category") {
  const where = ["p.status = 'PUBLISHED'"];
  const args: unknown[] = [];
  const add = (sql: string, v: unknown) => { args.push(v); where.push(sql.replace(/\?/g, `$${args.length}`)); };
  if (f.q) add("(p.title ILIKE ? OR p.sku ILIKE ? OR EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE ?))", `%${f.q}%`);
  if (skip !== "brand" && f.brand.length) add("b.slug = ANY(?::text[])", f.brand);
  if (f.minPrice != null) add("p.selling_price >= ?", f.minPrice);
  if (f.maxPrice != null) add("p.selling_price <= ?", f.maxPrice);
  if (f.inStock) where.push("p.stock_quantity > 0");
  if (f.onSale) where.push("p.marked_price > p.selling_price");
  if (skip !== "tag" && f.tag.length) add("p.tags && ?::text[]", f.tag);
  if (skip !== "category" && f.category.length) {
    add(
      `EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id IN (
         WITH RECURSIVE t AS (
           SELECT id FROM categories WHERE slug = ANY(?::text[])
           UNION ALL SELECT c.id FROM categories c JOIN t ON c.parent_id = t.id)
         SELECT id FROM t))`,
      f.category
    );
  }
  return { sql: `FROM products p LEFT JOIN brands b ON b.id = p.brand_id WHERE ${where.join(" AND ")}`, args };
}

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  // Postgres-backed for now; swap the body for a Typesense query once the index sync worker exists.
  app.get("/products", async (req) => {
    const f = listQuery.parse(req.query);
    const key = `catalog:list:${JSON.stringify(f)}`;
    return cached(key, 60, async () => {
      const { sql: from, args } = buildWhere(f);
      const total = Number((await pool.query(`SELECT count(*) ${from}`, args)).rows[0].count);
      const { rows } = await pool.query(
        `SELECT p.id, p.title, p.slug, p.marked_price, p.selling_price, p.stock_quantity, p.images, p.tags,
                p.metafields->>'videoUrl' AS video_url, b.name AS brand_name, b.slug AS brand_slug,
                (SELECT round(avg(rv.rating)::numeric, 1) FROM reviews rv WHERE rv.product_id = p.id AND rv.status = 'APPROVED') AS rating_avg,
                ${RATING_COUNT} AS rating_count,
                CASE WHEN p.marked_price > p.selling_price
                     THEN round((p.marked_price - p.selling_price) / p.marked_price * 100) END AS discount_pct
         ${from} ORDER BY ${ORDER[f.sort]} LIMIT ${f.pageSize} OFFSET ${(f.page - 1) * f.pageSize}`,
        args
      );
      return { items: rows, page: f.page, pageSize: f.pageSize, total };
    });
  });

  // Live filter counts for the sidebar: brands, tags and the price range, given the other active filters.
  app.get("/products/facets", async (req) => {
    const f = listQuery.parse(req.query);
    return cached(`catalog:facets:${JSON.stringify({ ...f, page: 1, sort: "newest" })}`, 60, async () => {
      const b = buildWhere(f, "brand");
      const t = buildWhere(f, "tag");
      const all = buildWhere(f);
      const [brands, tags, range, onSale, inStock] = await Promise.all([
        pool.query(`SELECT b.slug, b.name, count(*)::int AS count ${b.sql} AND b.id IS NOT NULL GROUP BY b.slug, b.name ORDER BY count DESC, b.name LIMIT 30`, b.args),
        pool.query(`SELECT tag, count(*)::int AS count FROM (SELECT unnest(p.tags) AS tag ${t.sql}) x GROUP BY tag ORDER BY count DESC, tag LIMIT 30`, t.args),
        pool.query(`SELECT min(p.selling_price) AS min, max(p.selling_price) AS max ${all.sql}`, all.args),
        pool.query(`SELECT count(*)::int AS n ${all.sql} AND p.marked_price > p.selling_price`, all.args),
        pool.query(`SELECT count(*)::int AS n ${all.sql} AND p.stock_quantity > 0`, all.args),
      ]);
      return {
        brands: brands.rows,
        tags: tags.rows,
        price: { min: Number(range.rows[0].min ?? 0), max: Number(range.rows[0].max ?? 0) },
        onSale: onSale.rows[0].n,
        inStock: inStock.rows[0].n,
      };
    });
  });

  app.get<{ Params: { slug: string } }>("/products/:slug", async (req, reply) => {
    const { rows } = await pool.query(
      `SELECT p.*, b.name AS brand_name, b.slug AS brand_slug,
       (SELECT round(avg(rv.rating)::numeric, 1) FROM reviews rv WHERE rv.product_id = p.id AND rv.status = 'APPROVED') AS rating_avg,
       (SELECT count(*)::int FROM reviews rv WHERE rv.product_id = p.id AND rv.status = 'APPROVED') AS rating_count FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id WHERE p.slug = $1 AND p.status = 'PUBLISHED'`,
      [req.params.slug]
    );
    const p = rows[0];
    if (!p) return reply.status(404).send({ success: false, error: "Not found" });
    // wholesale_price is only exposed via cart pricing for approved buyers.
    delete p.wholesale_price;
    const [variants, tiers] = await Promise.all([
      pool.query("SELECT id, title, sku, price, stock_quantity, variant_attributes, image_index FROM product_variants WHERE product_id = $1", [p.id]),
      pool.query("SELECT min_qty, unit_price FROM price_tiers WHERE product_id = $1 ORDER BY min_qty", [p.id]),
    ]);
    return { ...p, variants: variants.rows, priceTiers: tiers.rows };
  });

  // Same-category products first (up to 4), topped up with newest if the category is small.
  app.get<{ Params: { slug: string } }>("/products/:slug/related", async (req, reply) => {
    const cols = `p.id, p.title, p.slug, p.marked_price, p.selling_price, p.stock_quantity, p.images, p.tags, b.name AS brand_name,
      (SELECT round(avg(rv.rating)::numeric, 1) FROM reviews rv WHERE rv.product_id = p.id AND rv.status = 'APPROVED') AS rating_avg,
      (SELECT count(*)::int FROM reviews rv WHERE rv.product_id = p.id AND rv.status = 'APPROVED') AS rating_count,
      CASE WHEN p.marked_price > p.selling_price THEN round((p.marked_price - p.selling_price) / p.marked_price * 100) END AS discount_pct`;
    const base = (await pool.query("SELECT id FROM products WHERE slug = $1 AND status = 'PUBLISHED'", [req.params.slug])).rows[0];
    if (!base) return reply.status(404).send({ success: false, error: "Not found" });
    const same = (await pool.query(
      `SELECT DISTINCT ${cols} FROM products p LEFT JOIN brands b ON b.id = p.brand_id
       JOIN product_categories pc ON pc.product_id = p.id
       WHERE p.status = 'PUBLISHED' AND p.id <> $1 AND pc.category_id IN (SELECT category_id FROM product_categories WHERE product_id = $1)
       LIMIT 4`, [base.id])).rows;
    if (same.length >= 4) return { items: same };
    const more = (await pool.query(
      `SELECT ${cols} FROM products p LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.status = 'PUBLISHED' AND p.id <> $1 AND p.id <> ALL($2::uuid[]) ORDER BY p.created_at DESC LIMIT $3`,
      [base.id, same.map((r) => r.id), 4 - same.length])).rows;
    return { items: [...same, ...more] };
  });

  // Cart upsells / "you may also like": products sharing a category with the given ids, topped up with newest.
  app.get("/products/recommend", async (req) => {
    const ids = String((req.query as any).ids ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 20);
    const limit = Math.min(Number((req.query as any).limit) || 4, 12);
    const cols = `p.id, p.title, p.slug, p.marked_price, p.selling_price, p.stock_quantity, p.images, p.tags, b.name AS brand_name,
      (SELECT round(avg(rv.rating)::numeric, 1) FROM reviews rv WHERE rv.product_id = p.id AND rv.status = 'APPROVED') AS rating_avg,
      ${RATING_COUNT} AS rating_count,
      CASE WHEN p.marked_price > p.selling_price THEN round((p.marked_price - p.selling_price) / p.marked_price * 100) END AS discount_pct,
      p.moq, EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id) AS has_variants`;
    const same = ids.length
      ? (await pool.query(
          `SELECT DISTINCT ${cols} FROM products p LEFT JOIN brands b ON b.id = p.brand_id
           JOIN product_categories pc ON pc.product_id = p.id
           WHERE p.status = 'PUBLISHED' AND p.stock_quantity > 0 AND p.id <> ALL($1::uuid[])
             AND pc.category_id IN (SELECT category_id FROM product_categories WHERE product_id = ANY($1::uuid[]))
           LIMIT $2`, [ids, limit])).rows
      : [];
    if (same.length >= limit) return { items: same };
    const more = (await pool.query(
      `SELECT ${cols} FROM products p LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.status = 'PUBLISHED' AND p.stock_quantity > 0 AND p.id <> ALL($1::uuid[]) AND p.id <> ALL($2::uuid[])
       ORDER BY ${RATING_COUNT} DESC, p.created_at DESC LIMIT $3`, [ids, same.map((r: any) => r.id), limit - same.length])).rows;
    return { items: [...same, ...more] };
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
