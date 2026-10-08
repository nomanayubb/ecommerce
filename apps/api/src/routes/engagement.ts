import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { limited, requireUser } from "../lib/auth.js";

const email = z.string().email().max(255).transform((s) => s.toLowerCase());

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10, "Please write at least 10 characters").max(2000),
});

export const engagementRoutes: FastifyPluginAsync = async (app) => {
  // ---- reviews (public list shows APPROVED only)
  app.get<{ Params: { slug: string } }>("/products/:slug/reviews", async (req, reply) => {
    const p = (await pool.query("SELECT id FROM products WHERE slug = $1 AND status = 'PUBLISHED'", [req.params.slug])).rows[0];
    if (!p) return reply.status(404).send({ success: false, error: "Not found" });
    const { rows } = await pool.query(
      `SELECT r.id, r.rating, r.title, r.body, r.verified, r.helpful_count, r.created_at,
              coalesce(nullif(trim(coalesce(u.first_name,'') || ' ' || left(coalesce(u.last_name,''), 1) || CASE WHEN u.last_name <> '' THEN '.' ELSE '' END), ''), 'Customer') AS author
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1 AND r.status = 'APPROVED' ORDER BY r.helpful_count DESC, r.created_at DESC LIMIT 50`, [p.id]);
    const dist = [0, 0, 0, 0, 0];
    rows.forEach((r) => dist[r.rating - 1]++);
    const count = rows.length;
    return {
      summary: { count, average: count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0, distribution: dist.reverse() }, // 5 -> 1
      items: rows,
    };
  });

  app.post<{ Params: { slug: string } }>("/products/:slug/reviews", { preHandler: requireUser }, async (req, reply) => {
    const b = reviewSchema.parse(req.body);
    const p = (await pool.query("SELECT id FROM products WHERE slug = $1 AND status = 'PUBLISHED'", [req.params.slug])).rows[0];
    if (!p) return reply.status(404).send({ success: false, error: "Not found" });
    const verified = !!(await pool.query(
      `SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.user_id = $1 AND oi.product_id = $2 AND o.order_status <> 'CANCELED' LIMIT 1`, [req.user.sub, p.id])).rowCount;
    try {
      await pool.query("INSERT INTO reviews (product_id, user_id, rating, title, body, verified) VALUES ($1,$2,$3,$4,$5,$6)", [p.id, req.user.sub, b.rating, b.title || null, b.body, verified]);
    } catch (e: any) {
      if (e.code === "23505") return reply.status(409).send({ success: false, error: "You have already reviewed this product" });
      throw e;
    }
    return reply.status(201).send({ success: true, verified, message: "Thank you! Your review will appear once it has been approved." });
  });

  app.post<{ Params: { id: string } }>("/reviews/:id/helpful", { preHandler: requireUser }, async (req, reply) => {
    const id = z.string().uuid().parse(req.params.id);
    const r = (await pool.query("SELECT user_id FROM reviews WHERE id = $1 AND status = 'APPROVED'", [id])).rows[0];
    if (!r) return reply.status(404).send({ success: false, error: "Not found" });
    if (r.user_id === req.user.sub) return reply.status(400).send({ success: false, error: "You cannot vote on your own review" });
    const ins = await pool.query("INSERT INTO review_votes (review_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, req.user.sub]);
    if (ins.rowCount) await pool.query("UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1", [id]);
    return { success: true, counted: !!ins.rowCount };
  });

  // ---- newsletter + back-in-stock (public, rate limited)
  app.post("/newsletter", async (req, reply) => {
    if (limited(`news:${req.ip}`, 8, 60 * 60_000)) return reply.status(429).send({ success: false, error: "Too many attempts. Please try again later." });
    const { email: e } = z.object({ email }).parse(req.body);
    await pool.query("INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING", [e]);
    return { success: true };
  });

  app.post<{ Params: { slug: string } }>("/products/:slug/stock-alert", async (req, reply) => {
    if (limited(`alert:${req.ip}`, 10, 60 * 60_000)) return reply.status(429).send({ success: false, error: "Too many attempts. Please try again later." });
    const { email: e } = z.object({ email }).parse(req.body);
    const p = (await pool.query("SELECT id FROM products WHERE slug = $1 AND status = 'PUBLISHED'", [req.params.slug])).rows[0];
    if (!p) return reply.status(404).send({ success: false, error: "Not found" });
    await pool.query("INSERT INTO stock_alerts (product_id, email) VALUES ($1,$2) ON CONFLICT DO NOTHING", [p.id, e]);
    return { success: true };
  });
};
