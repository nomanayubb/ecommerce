import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";

/** One file name rule for uploads and for the product import, so a spreadsheet can say "kettle-1.jpg". */
export const fileKey = (n: string) =>
  n.trim().toLowerCase().replace(/\.jpeg$/, ".jpg").replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
const MIMES = new Set(["image/webp", "image/jpeg", "image/png"]);

export const uploadPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { name: string } }>("/uploads/:name", async (req, reply) => {
    const r = (await pool.query("SELECT mime, data FROM uploads WHERE name = $1", [fileKey(req.params.name)])).rows[0];
    if (!r) return reply.status(404).send({ success: false, error: "Not found" });
    return reply.header("content-type", r.mime).header("cache-control", "public, max-age=86400").send(r.data);
  });
};

export const uploadAdminRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/uploads",
    { bodyLimit: 8 * 1024 * 1024, preHandler: async (req: any, reply: any) => { if (req.user.role === "WAREHOUSE") return reply.status(403).send({ success: false, error: "Forbidden" }); } },
    async (req, reply) => {
      const b = z.object({ name: z.string().min(1).max(160), mime: z.string(), data: z.string().min(10) }).parse(req.body);
      if (!MIMES.has(b.mime)) return reply.status(400).send({ success: false, error: "Use a JPG, PNG or WebP picture" });
      const buf = Buffer.from(b.data, "base64");
      if (buf.length > 6 * 1024 * 1024) return reply.status(400).send({ success: false, error: "Picture is over 6 MB" });
      const name = fileKey(b.name);
      if (!name) return reply.status(400).send({ success: false, error: "Bad file name" });
      await pool.query(
        "INSERT INTO uploads (name, mime, data) VALUES ($1,$2,$3) ON CONFLICT (name) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, created_at = now()",
        [name, b.mime, buf]
      );
      return { name, url: `/uploads/${name}` };
    }
  );
};
