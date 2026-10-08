import type { PoolClient } from "pg";
import { loadStore } from "../routes/settings.js";
import { discountFor, loadCoupon, type Coupon } from "./coupons.js";

export interface CartInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface PricedLine {
  productId: string;
  variantId: string | null;
  title: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export class CartError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Prices every line server-side. Pass lock=true inside a transaction to SELECT ... FOR UPDATE stock rows. */
export async function priceCart(
  db: Pick<PoolClient, "query">,
  items: CartInput[],
  opts: { wholesale: boolean; lock?: boolean; couponCode?: string | null; giftWrap?: boolean }
) {
  const lines: PricedLine[] = [];
  const lock = opts.lock ? " FOR UPDATE" : "";

  for (const item of items) {
    const { rows } = await db.query(
      `SELECT id, title, sku, selling_price, wholesale_price, stock_quantity, moq, is_digital
       FROM products WHERE id = $1 AND status = 'PUBLISHED'${lock}`,
      [item.productId]
    );
    const p = rows[0];
    if (!p) throw new CartError(`Product not available: ${item.productId}`, 404);
    if (item.quantity < p.moq) throw new CartError(`${p.title}: minimum order quantity is ${p.moq}`);

    let unit = Number(p.selling_price);
    let sku = p.sku as string;
    let title = p.title as string;
    let stock = p.stock_quantity as number;
    let tracked = !p.is_digital;

    if (item.variantId) {
      const v = (
        await db.query(
          `SELECT title, sku, price, stock_quantity FROM product_variants
           WHERE id = $1 AND product_id = $2${lock}`,
          [item.variantId, item.productId]
        )
      ).rows[0];
      if (!v) throw new CartError(`Variant not found for ${p.title}`, 404);
      unit = Number(v.price);
      sku = v.sku;
      title = `${p.title} - ${v.title}`;
      stock = v.stock_quantity;
    }

    if (tracked && item.quantity > stock) {
      throw new CartError(`${title}: only ${stock} in stock`, 409);
    }

    if (opts.wholesale && p.wholesale_price != null) unit = Math.min(unit, Number(p.wholesale_price));
    const tier = (
      await db.query(
        `SELECT unit_price FROM price_tiers WHERE product_id = $1 AND min_qty <= $2
         ORDER BY min_qty DESC LIMIT 1`,
        [item.productId, item.quantity]
      )
    ).rows[0];
    if (tier) unit = Math.min(unit, Number(tier.unit_price));

    lines.push({
      productId: p.id,
      variantId: item.variantId ?? null,
      title,
      sku,
      unitPrice: unit,
      quantity: item.quantity,
      totalPrice: Math.round(unit * item.quantity * 100) / 100,
    });
  }

  const subtotal = Math.round(lines.reduce((s, l) => s + l.totalPrice, 0) * 100) / 100;
  const store = await loadStore();

  // Coupon: while browsing a bad code is reported (couponError); at checkout (lock) it blocks the order.
  let coupon: Coupon | null = null;
  let couponError: string | null = null;
  if (opts.couponCode?.trim()) {
    try { coupon = await loadCoupon(db, opts.couponCode, subtotal, !!opts.lock); }
    catch (e) { if (opts.lock || !(e instanceof CartError)) throw e; couponError = e.message; }
  }
  const discount = coupon ? discountFor(coupon, subtotal) : 0;
  const afterDiscount = Math.round((subtotal - discount) * 100) / 100;
  const shippingFee = coupon?.kind === "FREE_SHIPPING" || afterDiscount >= store.freeShippingThreshold ? 0 : store.shippingFee;
  const giftWrapFee = opts.giftWrap && store.giftWrapEnabled ? store.giftWrapFee : 0;
  return {
    lines,
    subtotal,
    discount,
    coupon,
    couponError,
    shippingFee,
    giftWrap: !!opts.giftWrap && store.giftWrapEnabled,
    giftWrapFee,
    grandTotal: Math.round((afterDiscount + shippingFee + giftWrapFee) * 100) / 100,
    freeShippingRemaining: Math.max(0, store.freeShippingThreshold - afterDiscount),
  };
}
