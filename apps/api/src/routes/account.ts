import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { limited, requireUser } from "../lib/auth.js";

// Loyalty: 1 point per Rs. 100 on DELIVERED orders. Tier thresholds are in points.
const POINT_UNIT = 100;
const TIERS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 500 },
  { name: "Gold", min: 2000 },
] as const;

const STEPS = [
  ["PENDING", "Order placed"],
  ["PROCESSING", "Processing"],
  ["SHIPPED", "Shipped"],
  ["DELIVERED", "Delivered"],
] as const;

export function timeline(status: string) {
  const idx = STEPS.findIndex(([k]) => k === status);
  return {
    closed: status === "CANCELED" || status === "REFUNDED" ? status : null,
    steps: STEPS.map(([key, label], i) => ({ key, label, done: idx >= 0 && i <= idx, current: i === idx })),
  };
}

export function loyaltyFor(points: number) {
  const tier = [...TIERS].reverse().find((t) => points >= t.min)!;
  const next = TIERS.find((t) => t.min > points) ?? null;
  return { points, tier: tier.name, nextTier: next?.name ?? null, pointsToNext: next ? next.min - points : 0, pointUnit: POINT_UNIT, tiers: TIERS };
}

const addressSchema = z.object({
  label: z.string().max(40).optional(),
  name: z.string().min(1).max(120),
  phone: z.string().min(7).max(50),
  line1: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  province: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  isDefault: z.boolean().default(false),
});

const digits = (s: string) => s.replace(/\D/g, "").slice(-10);

export const accountRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: requireUser };

  app.get("/account/me", auth, async (req, reply) => {
    const u = (await pool.query("SELECT id, email, first_name, last_name, phone, role, wholesale_status FROM users WHERE id = $1", [req.user.sub])).rows[0];
    if (!u) return reply.status(401).send({ success: false, error: "Please sign in" });
    const pts = (await pool.query(
      "SELECT coalesce(sum(floor(grand_total / $2)), 0)::int AS p FROM orders WHERE user_id = $1 AND order_status = 'DELIVERED'",
      [u.id, POINT_UNIT]
    )).rows[0].p as number;
    return {
      user: { id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, phone: u.phone, role: u.role, wholesaleStatus: u.wholesale_status },
      loyalty: loyaltyFor(pts),
    };
  });

  app.put("/account/me", auth, async (req) => {
    const b = z.object({ firstName: z.string().max(100), lastName: z.string().max(100), phone: z.string().max(50) }).parse(req.body);
    await pool.query("UPDATE users SET first_name = $2, last_name = $3, phone = $4, updated_at = now() WHERE id = $1", [req.user.sub, b.firstName, b.lastName, b.phone]);
    return { success: true };
  });

  // ---- address book
  app.get("/account/addresses", auth, async (req) =>
    (await pool.query("SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC", [req.user.sub])).rows
  );

  const saveAddress = async (userId: string, b: z.infer<typeof addressSchema>, id?: string) => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const count = Number((await c.query("SELECT count(*) FROM addresses WHERE user_id = $1", [userId])).rows[0].count);
      const makeDefault = b.isDefault || (!id && count === 0);
      if (makeDefault) await c.query("UPDATE addresses SET is_default = FALSE WHERE user_id = $1", [userId]);
      const args = [userId, b.label ?? null, b.name, b.phone, b.line1, b.city, b.province ?? null, b.postalCode ?? null, makeDefault];
      const r = id
        ? await c.query("UPDATE addresses SET label=$2,name=$3,phone=$4,line1=$5,city=$6,province=$7,postal_code=$8,is_default=$9 WHERE user_id=$1 AND id=$10 RETURNING id", [...args, id])
        : await c.query("INSERT INTO addresses (user_id,label,name,phone,line1,city,province,postal_code,is_default) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id", args);
      await c.query("COMMIT");
      return r.rows[0]?.id as string | undefined;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  };

  app.post("/account/addresses", auth, async (req, reply) => {
    const id = await saveAddress(req.user.sub, addressSchema.parse(req.body));
    return reply.status(201).send({ id });
  });
  app.put<{ Params: { id: string } }>("/account/addresses/:id", auth, async (req, reply) => {
    const id = await saveAddress(req.user.sub, addressSchema.parse(req.body), z.string().uuid().parse(req.params.id));
    return id ? { id } : reply.status(404).send({ success: false, error: "Address not found" });
  });
  app.delete<{ Params: { id: string } }>("/account/addresses/:id", auth, async (req, reply) => {
    const r = await pool.query("DELETE FROM addresses WHERE user_id = $1 AND id = $2", [req.user.sub, z.string().uuid().parse(req.params.id)]);
    return r.rowCount ? { success: true } : reply.status(404).send({ success: false, error: "Address not found" });
  });

  // ---- orders
  app.get("/account/orders", auth, async (req) =>
    (await pool.query(
      `SELECT order_number, order_status, payment_status, payment_method, grand_total, created_at,
              (SELECT coalesce(sum(quantity), 0)::int FROM order_items WHERE order_id = o.id) AS item_count
       FROM orders o WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.user.sub])).rows
  );

  app.get<{ Params: { number: string } }>("/account/orders/:number", auth, async (req, reply) => {
    const n = z.coerce.number().int().parse(req.params.number);
    const o = (await pool.query("SELECT * FROM orders WHERE order_number = $1 AND user_id = $2", [n, req.user.sub])).rows[0];
    if (!o) return reply.status(404).send({ success: false, error: "Order not found" });
    const items = (await pool.query("SELECT product_id, variant_id, title, sku, unit_price, quantity, total_price FROM order_items WHERE order_id = $1", [o.id])).rows;
    return { order: { ...o, id: undefined }, items, timeline: timeline(o.order_status) };
  });

  // ---- guest order tracking: order number + the phone used at checkout (rate limited against guessing)
  app.get("/orders/track", async (req, reply) => {
    if (limited(`track:${req.ip}`, 10, 10 * 60_000)) return reply.status(429).send({ success: false, error: "Too many attempts. Please try again in a few minutes." });
    const q = z.object({ number: z.coerce.number().int(), phone: z.string().min(7) }).parse(req.query);
    const o = (await pool.query("SELECT * FROM orders WHERE order_number = $1", [q.number])).rows[0];
    const ok = o && digits(String(o.shipping_address?.phone ?? "")) === digits(q.phone);
    if (!ok) return reply.status(404).send({ success: false, error: "We could not find an order with those details." });
    const items = (await pool.query("SELECT title, unit_price, quantity FROM order_items WHERE order_id = $1", [o.id])).rows;
    return {
      order: { order_number: o.order_number, order_status: o.order_status, payment_status: o.payment_status, payment_method: o.payment_method, grand_total: o.grand_total, created_at: o.created_at, city: o.shipping_address?.city },
      items, timeline: timeline(o.order_status),
    };
  });
};
