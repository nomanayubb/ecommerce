import crypto from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { DEFAULT_HOME, SECTIONS, defaultsOf, sanitizeSections } from "../lib/sections.js";

const keySchema = z.string().regex(/^(home|page:[a-z0-9-]{1,60})$/, "Invalid page key");
const seoSchema = z.object({ title: z.string().max(120).default(""), description: z.string().max(300).default("") });

// Short-lived signed preview links (HMAC, scoped to one page key). Not a login token.
const secret = () => `${process.env.JWT_SECRET ?? ""}:preview`;
const sign = (key: string, ttlSec: number) => {
  const body = Buffer.from(JSON.stringify({ key, exp: Math.floor(Date.now() / 1000) + ttlSec })).toString("base64url");
  return `${body}.${crypto.createHmac("sha256", secret()).update(body).digest("base64url")}`;
};
const verify = (token: string, key: string) => {
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const good = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  try { const p = JSON.parse(Buffer.from(body, "base64url").toString()); return p.key === key && p.exp > Date.now() / 1000; } catch { return false; }
};

/** Public: what the storefront renders. */
export const templateRoutes: FastifyPluginAsync = async (app) => {
  app.get("/templates", async (req, reply) => {
    const key = keySchema.parse((req.query as { key?: string }).key);
    const row = (await pool.query("SELECT title, published, seo FROM page_templates WHERE key = $1", [key])).rows[0];
    if (key === "home") return { key, title: row?.title ?? "Home", seo: row?.seo ?? {}, sections: (row?.published?.sections ?? DEFAULT_HOME) };
    if (!row?.published) return reply.status(404).send({ success: false, error: "Page not found" });
    return { key, title: row.title, seo: row.seo, sections: row.published.sections };
  });

  app.get("/templates/preview", async (req, reply) => {
    const q = z.object({ key: keySchema, token: z.string().max(600) }).parse(req.query);
    if (!verify(q.token, q.key)) return reply.status(403).send({ success: false, error: "Preview link expired" });
    const row = (await pool.query("SELECT title, draft, seo FROM page_templates WHERE key = $1", [q.key])).rows[0];
    return { key: q.key, title: row?.title ?? "Home", seo: row?.seo ?? {}, sections: row?.draft?.sections ?? (q.key === "home" ? DEFAULT_HOME : []) };
  });
};

/** Admin: registered inside the admin plugin, so the staff-only hook already applies. */
export const templateAdminRoutes: FastifyPluginAsync = async (app) => {
  const writer = async (req: any, reply: any) => {
    if (req.user.role === "WAREHOUSE") return reply.status(403).send({ success: false, error: "Forbidden" });
  };
  const keyOf = (req: any) => keySchema.parse(req.query?.key);

  // ensure the home row exists (draft starts as the built-in default layout)
  const ensureHome = () =>
    pool.query("INSERT INTO page_templates (key, title, draft) VALUES ('home', 'Home page', $1) ON CONFLICT DO NOTHING", [JSON.stringify({ sections: DEFAULT_HOME })]);

  app.get("/section-schemas", async () => ({
    sections: SECTIONS.map((s) => ({ ...s, defaults: defaultsOf(s.fields), block: s.block ? { ...s.block, defaults: defaultsOf(s.block.fields) } : undefined })),
  }));

  app.get("/templates", async () => {
    await ensureHome();
    return (await pool.query("SELECT key, title, published IS NOT NULL AS is_published, updated_at, published_at FROM page_templates ORDER BY (key = 'home') DESC, title")).rows;
  });

  app.get("/templates/item", async (req) => {
    const key = keyOf(req);
    if (key === "home") await ensureHome();
    const row = (await pool.query("SELECT key, title, draft, published, seo, updated_at, published_at FROM page_templates WHERE key = $1", [key])).rows[0];
    if (!row) throw Object.assign(new Error("Page not found"), { statusCode: 404 });
    const versions = (await pool.query("SELECT id, label, created_at FROM template_versions WHERE key = $1 ORDER BY created_at DESC LIMIT 20", [key])).rows;
    return { ...row, versions, publishedSameAsDraft: JSON.stringify(row.draft) === JSON.stringify(row.published) };
  });

  app.post("/templates/create", { preHandler: writer }, async (req, reply) => {
    const b = z.object({ title: z.string().min(1).max(80), slug: z.string().regex(/^[a-z0-9-]{1,60}$/, "Use lowercase letters, numbers and dashes") }).parse(req.body);
    const r = await pool.query("INSERT INTO page_templates (key, title) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING key", [`page:${b.slug}`, b.title]);
    if (!r.rowCount) return reply.status(409).send({ success: false, error: "A page with that address already exists" });
    return reply.status(201).send({ key: `page:${b.slug}` });
  });

  app.put("/templates/item", { preHandler: writer }, async (req) => {
    const key = keyOf(req);
    const b = z.object({ title: z.string().min(1).max(80).optional(), sections: z.unknown(), seo: seoSchema.optional() }).parse(req.body);
    const sections = sanitizeSections(b.sections);
    if (key === "home") await ensureHome();
    const r = await pool.query(
      "UPDATE page_templates SET draft = $2, title = coalesce($3, title), seo = coalesce($4, seo), updated_at = now() WHERE key = $1 RETURNING key",
      [key, JSON.stringify({ sections }), b.title ?? null, b.seo ? JSON.stringify(b.seo) : null]
    );
    if (!r.rowCount) throw Object.assign(new Error("Page not found"), { statusCode: 404 });
    return { success: true, sections };
  });

  app.post("/templates/publish", { preHandler: writer }, async (req) => {
    const key = keyOf(req);
    const b = z.object({ label: z.string().max(80).optional() }).parse(req.body ?? {});
    const row = (await pool.query("UPDATE page_templates SET published = draft, published_at = now() WHERE key = $1 RETURNING draft", [key])).rows[0];
    if (!row) throw Object.assign(new Error("Page not found"), { statusCode: 404 });
    await pool.query("INSERT INTO template_versions (key, content, label, created_by) VALUES ($1, $2, $3, $4)", [key, JSON.stringify(row.draft), b.label ?? "Published", (req.user as any).sub]);
    // keep the 30 most recent versions
    await pool.query("DELETE FROM template_versions WHERE key = $1 AND id NOT IN (SELECT id FROM template_versions WHERE key = $1 ORDER BY created_at DESC LIMIT 30)", [key]);
    return { success: true };
  });

  app.post("/templates/rollback", { preHandler: writer }, async (req) => {
    const key = keyOf(req);
    const { versionId } = z.object({ versionId: z.string().uuid() }).parse(req.body);
    const v = (await pool.query("SELECT content FROM template_versions WHERE id = $1 AND key = $2", [versionId, key])).rows[0];
    if (!v) throw Object.assign(new Error("Version not found"), { statusCode: 404 });
    await pool.query("UPDATE page_templates SET draft = $2, updated_at = now() WHERE key = $1", [key, JSON.stringify(v.content)]);
    return { success: true, sections: v.content.sections }; // restored into the draft; publish to make it live
  });

  app.post("/templates/preview-token", async (req) => ({ token: sign(keyOf(req), 600), expiresInSeconds: 600 }));

  app.delete("/templates/item", { preHandler: writer }, async (req, reply) => {
    const key = keyOf(req);
    if (key === "home") return reply.status(400).send({ success: false, error: "The home page cannot be deleted" });
    await pool.query("DELETE FROM page_templates WHERE key = $1", [key]);
    return { success: true };
  });

  // ---- reusable section presets
  app.get("/section-presets", async () => (await pool.query("SELECT id, name, type, content FROM section_presets ORDER BY created_at DESC LIMIT 100")).rows);
  app.post("/section-presets", { preHandler: writer }, async (req, reply) => {
    const b = z.object({ name: z.string().min(1).max(80), section: z.unknown() }).parse(req.body);
    const [s] = sanitizeSections([b.section]);
    await pool.query("INSERT INTO section_presets (name, type, content) VALUES ($1,$2,$3)", [b.name, s.type, JSON.stringify({ settings: s.settings, blocks: s.blocks })]);
    return reply.status(201).send({ success: true });
  });
  app.delete("/section-presets", { preHandler: writer }, async (req) => {
    await pool.query("DELETE FROM section_presets WHERE id = $1", [z.string().uuid().parse((req.query as { id?: string }).id)]);
    return { success: true };
  });
};
