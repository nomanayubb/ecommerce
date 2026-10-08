import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { cached } from "../lib/redis.js";

const clean = (q: string) => q.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60);

export const searchRoutes: FastifyPluginAsync = async (app) => {
  // As-you-type: a few products (with thumbnail + price), matching categories and brands.
  app.get("/search/suggest", async (req) => {
    const q = clean(z.object({ q: z.string().default("") }).parse(req.query).q);
    if (q.length < 2) return { products: [], categories: [], brands: [] };
    return cached(`search:suggest:${q}`, 30, async () => {
      const like = `%${q.replace(/[%_]/g, "")}%`;
      const [products, categories, brands] = await Promise.all([
        pool.query(
          `SELECT p.title, p.slug, p.images[1] AS image, p.selling_price, p.stock_quantity,
                  CASE WHEN p.marked_price > p.selling_price THEN round((p.marked_price - p.selling_price) / p.marked_price * 100) END AS discount_pct
           FROM products p WHERE p.status = 'PUBLISHED' AND (p.title ILIKE $1 OR p.sku ILIKE $1 OR EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE $1))
           ORDER BY (p.title ILIKE $2) DESC, p.title LIMIT 6`,
          [like, `${q.replace(/[%_]/g, "")}%`]
        ),
        pool.query("SELECT name, slug FROM categories WHERE is_active AND name ILIKE $1 ORDER BY name LIMIT 3", [like]),
        pool.query("SELECT name, slug FROM brands WHERE name ILIKE $1 ORDER BY name LIMIT 3", [like]),
      ]);
      return { products: products.rows, categories: categories.rows, brands: brands.rows };
    });
  });

  // Most-searched terms in the last 30 days; falls back to top categories on a fresh store.
  app.get("/search/trending", async () =>
    cached("search:trending", 120, async () => {
      const t = await pool.query("SELECT q FROM search_queries WHERE last_at > now() - interval '30 days' ORDER BY hits DESC, last_at DESC LIMIT 8");
      if (t.rows.length >= 3) return { terms: t.rows.map((r) => r.q as string) };
      const c = await pool.query("SELECT lower(name) AS q FROM categories WHERE is_active AND parent_id IS NULL ORDER BY sort_order, name LIMIT 8");
      return { terms: [...new Set([...t.rows.map((r) => r.q as string), ...c.rows.map((r) => r.q as string)])].slice(0, 8) };
    })
  );

  // Fire-and-forget from the storefront when a search is submitted.
  app.post("/search/log", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
    const q = clean(z.object({ q: z.string() }).parse(req.body).q);
    if (q.length >= 2 && !/^https?:|<|>/.test(q)) {
      await pool.query(
        "INSERT INTO search_queries (q) VALUES ($1) ON CONFLICT (q) DO UPDATE SET hits = search_queries.hits + 1, last_at = now()",
        [q]
      );
    }
    return reply.status(204).send();
  });
};
