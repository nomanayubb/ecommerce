import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";

const date = z.string().datetime().nullish().transform((v) => v ?? null);
const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "Code: 3-30 letters, numbers, - or _"),
  description: z.string().trim().max(200).default(""),
  kind: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.number().min(0).max(10_000_000).default(0),
  minSubtotal: z.number().min(0).default(0),
  maxDiscount: z.number().min(0).nullish().transform((v) => v ?? null),
  maxUses: z.number().int().min(1).nullish().transform((v) => v ?? null),
  startsAt: date,
  endsAt: date,
  active: z.boolean().default(true),
}).refine((c) => c.kind !== "PERCENT" || c.value <= 100, { message: "Percent cannot exceed 100", path: ["value"] })
  .refine((c) => c.kind === "FREE_SHIPPING" || c.value > 0, { message: "Value must be above 0", path: ["value"] });

export const couponAdminRoutes: FastifyPluginAsync = async (app) => {
  const writer = async (req: any, reply: any) => {
    if (req.user.role === "WAREHOUSE") return reply.status(403).send({ success: false, error: "Forbidden" });
  };

  app.get("/coupons", async () =>
    (await pool.query("SELECT code, description, kind, value, min_subtotal, max_discount, max_uses, used_count, starts_at, ends_at, active, created_at FROM coupons ORDER BY created_at DESC LIMIT 200")).rows
  );

  app.post("/coupons", { preHandler: writer }, async (req, reply) => {
    const c = couponSchema.parse(req.body);
    try {
      await pool.query(
        `INSERT INTO coupons (code, description, kind, value, min_subtotal, max_discount, max_uses, starts_at, ends_at, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [c.code, c.description, c.kind, c.value, c.minSubtotal, c.maxDiscount, c.maxUses, c.startsAt, c.endsAt, c.active]
      );
    } catch (e: any) {
      if (e.code === "23505") return reply.status(409).send({ success: false, error: "That code already exists" });
      throw e;
    }
    return reply.status(201).send({ success: true });
  });

  app.put<{ Params: { code: string } }>("/coupons/:code", { preHandler: writer }, async (req, reply) => {
    const c = couponSchema.parse({ ...(req.body as object), code: req.params.code });
    const r = await pool.query(
      `UPDATE coupons SET description=$2, kind=$3, value=$4, min_subtotal=$5, max_discount=$6, max_uses=$7, starts_at=$8, ends_at=$9, active=$10 WHERE code=$1`,
      [c.code, c.description, c.kind, c.value, c.minSubtotal, c.maxDiscount, c.maxUses, c.startsAt, c.endsAt, c.active]
    );
    if (!r.rowCount) return reply.status(404).send({ success: false, error: "Not found" });
    return { success: true };
  });

  app.delete<{ Params: { code: string } }>("/coupons/:code", { preHandler: writer }, async (req) => {
    await pool.query("DELETE FROM coupons WHERE code = $1", [req.params.code.toUpperCase()]);
    return { success: true };
  });
};
