import type { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { delPattern } from "../lib/redis.js";
import { priceCart } from "../lib/pricing.js";

const itemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullish(),
  quantity: z.number().int().min(1).max(10000),
});
const addressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7),
  line1: z.string().min(1),
  city: z.string().min(1),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("PK"),
});
const checkoutSchema = z.object({
  items: z.array(itemSchema).min(1),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethod: z.enum(["COD", "EASYPAISA", "JAZZCASH", "STRIPE"]),
  notes: z.string().max(1000).optional(),
  couponCode: z.string().max(30).optional(),
  giftWrap: z.boolean().optional(),
  giftMessage: z.string().trim().max(300).optional(),
});

/** Optional auth: guests allowed, but a valid token enables wholesale pricing and links the order. */
async function optionalUser(req: any) {
  try {
    await req.jwtVerify();
    return req.user as { sub: string; wholesale: boolean };
  } catch {
    return null;
  }
}

export const checkoutRoutes: FastifyPluginAsync = async (app) => {
  app.post("/cart/validate", async (req) => {
    const { items, couponCode, giftWrap } = z.object({ items: z.array(itemSchema).min(1), couponCode: z.string().max(30).optional(), giftWrap: z.boolean().optional() }).parse(req.body);
    const user = await optionalUser(req);
    return priceCart(pool, items, { wholesale: !!user?.wholesale, couponCode, giftWrap });
  });

  app.post("/checkout/process", async (req, reply) => {
    const b = checkoutSchema.parse(req.body);
    const enabled = (process.env.ENABLED_PAYMENT_METHODS ?? "COD").split(",").map((s) => s.trim());
    if (!enabled.includes(b.paymentMethod)) {
      return reply.status(400).send({ success: false, error: `${b.paymentMethod} is not available yet` });
    }
    const user = await optionalUser(req);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Rows are locked FOR UPDATE so concurrent checkouts cannot oversell.
      const cart = await priceCart(client, b.items, { wholesale: !!user?.wholesale, lock: true, couponCode: b.couponCode, giftWrap: b.giftWrap });

      const order = (
        await client.query(
          `INSERT INTO orders (user_id, shipping_address, billing_address, subtotal, shipping_fee,
                               grand_total, payment_method, notes, discount_total, coupon_code, gift_wrap, gift_message, gift_wrap_fee)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id, order_number`,
          [
            user?.sub ?? null,
            JSON.stringify(b.shippingAddress),
            JSON.stringify(b.billingAddress ?? b.shippingAddress),
            cart.subtotal,
            cart.shippingFee,
            cart.grandTotal,
            b.paymentMethod,
            b.notes,
            cart.discount,
            cart.coupon?.code ?? null,
            cart.giftWrap,
            cart.giftWrap ? b.giftMessage || null : null,
            cart.giftWrapFee,
          ]
        )
      ).rows[0];

      for (const l of cart.lines) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, variant_id, title, sku, unit_price, quantity, total_price)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [order.id, l.productId, l.variantId, l.title, l.sku, l.unitPrice, l.quantity, l.totalPrice]
        );
        await client.query(
          l.variantId
            ? "UPDATE product_variants SET stock_quantity = stock_quantity - $2 WHERE id = $1"
            : "UPDATE products SET stock_quantity = stock_quantity - $2 WHERE id = $1 AND NOT is_digital",
          [l.variantId ?? l.productId, l.quantity]
        );
      }
      if (cart.coupon) await client.query("UPDATE coupons SET used_count = used_count + 1 WHERE code = $1", [cart.coupon.code]);
      await client.query("COMMIT");
      delPattern("catalog:*");

      return reply.status(201).send({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        grandTotal: cart.grandTotal,
        paymentInstructions: paymentInstructions(b.paymentMethod, order.order_number, cart.grandTotal),
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  });

  // Gateway callback. Real EasyPaisa/JazzCash/Stripe each sign differently; this verifies a generic
  // HMAC-SHA256 of the raw body until the per-gateway adapters are written.
  app.post(
    "/payments/webhook",
    { config: { rawBody: true } },
    async (req, reply) => {
      const secret = process.env.PAYMENT_WEBHOOK_SECRET;
      if (!secret) return reply.status(503).send({ success: false, error: "Webhook not configured" });
      const sig = String(req.headers["x-signature"] ?? "");
      const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
      const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      if (!ok) return reply.status(401).send({ success: false, error: "Bad signature" });

      const { orderNumber, status, reference } = z
        .object({ orderNumber: z.number().int(), status: z.enum(["PAID", "FAILED"]), reference: z.string() })
        .parse(req.body);
      await pool.query(
        `UPDATE orders SET payment_status = $2, payment_gateway_reference = $3,
           order_status = CASE WHEN $2 = 'PAID' THEN 'PROCESSING'::order_status ELSE order_status END,
           updated_at = now()
         WHERE order_number = $1 AND payment_status = 'UNPAID'`,
        [orderNumber, status, reference]
      );
      return { success: true };
    }
  );
};

function paymentInstructions(method: string, orderNumber: number, amount: number) {
  switch (method) {
    case "COD":
      return { type: "DIRECT_CONFIRMATION", message: "Order placed. Cash will be collected on delivery." };
    // Gateway adapters need merchant credentials/sandbox access; they plug in here.
    default:
      return { type: "PENDING_GATEWAY", gateway: method, orderNumber, amount, message: `${method} adapter not configured yet` };
  }
}
