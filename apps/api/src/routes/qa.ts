import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { limited } from "../lib/auth.js";

// ---- live viewers: who pinged a product page in the last 45 s (in memory, one API process; use Redis if you scale out)
const WINDOW_MS = 45_000;
const presence = new Map<string, Map<string, number>>();
const prune = (slug: string) => {
  const m = presence.get(slug);
  if (!m) return 0;
  const cut = Date.now() - WINDOW_MS;
  for (const [sid, t] of m) if (t < cut) m.delete(sid);
  if (!m.size) presence.delete(slug);
  return m.size;
};

async function optionalUser(req: any) {
  try { await req.jwtVerify(); return req.user as { sub: string }; } catch { return null; }
}

export const qaRoutes: FastifyPluginAsync = async (app) => {
  app.post("/presence/ping", async (req, reply) => {
    const { slug, sid } = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,120}$/), sid: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/) }).parse(req.body);
    if (limited(`presence:${req.ip}`, 60, 60_000)) return reply.status(429).send({ success: false, error: "Slow down" });
    if (presence.size > 5000 && !presence.has(slug)) return reply.status(204).send();
    if (!presence.has(slug)) presence.set(slug, new Map());
    presence.get(slug)!.set(sid, Date.now());
    return { viewers: prune(slug) };
  });
  app.get("/presence", async (req) => {
    const { slug } = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,120}$/) }).parse(req.query);
    return { viewers: prune(slug) };
  });

  // ---- questions and answers
  app.get<{ Params: { slug: string } }>("/products/:slug/qa", async (req, reply) => {
    const p = (await pool.query("SELECT id FROM products WHERE slug = $1 AND status = 'PUBLISHED'", [req.params.slug])).rows[0];
    if (!p) return reply.status(404).send({ success: false, error: "Not found" });
    const { rows } = await pool.query(
      "SELECT id, name, question, answer, created_at, answered_at FROM product_qa WHERE product_id = $1 AND status = 'APPROVED' ORDER BY (answer IS NOT NULL) DESC, created_at DESC LIMIT 50",
      [p.id]
    );
    return { items: rows };
  });

  app.post<{ Params: { slug: string } }>("/products/:slug/qa", async (req, reply) => {
    const b = z.object({
      name: z.string().trim().min(1, "Please add your name").max(80),
      question: z.string().trim().min(5, "Please write at least 5 characters").max(500),
    }).parse(req.body);
    if (limited(`qa:${req.ip}`, 5, 10 * 60_000)) return reply.status(429).send({ success: false, error: "Too many questions, please try again later" });
    const p = (await pool.query("SELECT id FROM products WHERE slug = $1 AND status = 'PUBLISHED'", [req.params.slug])).rows[0];
    if (!p) return reply.status(404).send({ success: false, error: "Not found" });
    const user = await optionalUser(req);
    await pool.query("INSERT INTO product_qa (product_id, user_id, name, question) VALUES ($1,$2,$3,$4)", [p.id, user?.sub ?? null, b.name, b.question]);
    return reply.status(201).send({ success: true, message: "Thank you! Your question will appear once the shop has answered it." });
  });
};

export const qaAdminRoutes: FastifyPluginAsync = async (app) => {
  const writer = async (req: any, reply: any) => {
    if (req.user.role === "WAREHOUSE") return reply.status(403).send({ success: false, error: "Forbidden" });
  };
  app.get("/qa", async (req) => {
    const { status } = z.object({ status: z.enum(["PENDING", "APPROVED", "HIDDEN"]).optional() }).parse(req.query);
    return (await pool.query(
      `SELECT q.id, q.name, q.question, q.answer, q.status, q.created_at, p.title AS product_title, p.slug AS product_slug
       FROM product_qa q JOIN products p ON p.id = q.product_id WHERE ($1::text IS NULL OR q.status = $1) ORDER BY q.created_at DESC LIMIT 100`,
      [status ?? null]
    )).rows;
  });
  // Answering approves; "HIDDEN" removes it from the page.
  app.patch<{ Params: { id: string } }>("/qa/:id", { preHandler: writer }, async (req, reply) => {
    const b = z.object({ answer: z.string().trim().max(1000).nullish().transform((v) => v || null), status: z.enum(["PENDING", "APPROVED", "HIDDEN"]) }).parse(req.body);
    const r = await pool.query(
      "UPDATE product_qa SET answer = $2, status = $3, answered_at = CASE WHEN $2::text IS NOT NULL THEN now() ELSE answered_at END WHERE id = $1 RETURNING id",
      [req.params.id, b.answer, b.status]
    );
    if (!r.rowCount) return reply.status(404).send({ success: false, error: "Not found" });
    return { success: true };
  });
};
