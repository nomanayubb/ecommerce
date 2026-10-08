import type { PoolClient } from "pg";
import { CartError } from "./pricing.js";

export interface Coupon {
  code: string;
  kind: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  maxDiscount: number | null;
  label: string;
}

const pkr = (n: number) => `Rs. ${n.toLocaleString("en-PK")}`;

/** Checks a coupon against the cart. Throws CartError with a customer-friendly message. lock=true inside checkout. */
export async function loadCoupon(db: Pick<PoolClient, "query">, raw: string, subtotal: number, lock = false): Promise<Coupon> {
  const code = raw.trim().toUpperCase();
  const c = (await db.query(`SELECT * FROM coupons WHERE code = $1${lock ? " FOR UPDATE" : ""}`, [code])).rows[0];
  if (!c || !c.active) throw new CartError("That code is not valid.");
  const now = Date.now();
  if (c.starts_at && new Date(c.starts_at).getTime() > now) throw new CartError("That code is not active yet.");
  if (c.ends_at && new Date(c.ends_at).getTime() < now) throw new CartError("That code has expired.");
  if (c.max_uses != null && c.used_count >= c.max_uses) throw new CartError("That code has been fully used.");
  if (subtotal < Number(c.min_subtotal)) throw new CartError(`Spend ${pkr(Number(c.min_subtotal))} or more to use ${code}.`);
  const value = Number(c.value);
  return {
    code,
    kind: c.kind,
    value,
    maxDiscount: c.max_discount == null ? null : Number(c.max_discount),
    label: c.kind === "PERCENT" ? `${value}% off` : c.kind === "FIXED" ? `${pkr(value)} off` : "Free delivery",
  };
}

export const discountFor = (c: Coupon, subtotal: number) => {
  if (c.kind === "FREE_SHIPPING") return 0;
  const raw = c.kind === "PERCENT" ? (subtotal * c.value) / 100 : c.value;
  const capped = c.maxDiscount != null ? Math.min(raw, c.maxDiscount) : raw;
  return Math.round(Math.min(capped, subtotal) * 100) / 100;
};
