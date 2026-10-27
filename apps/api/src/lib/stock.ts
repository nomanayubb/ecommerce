import { loadStore } from "../routes/settings.js";

/** The shop's stock rule (admin: Settings, Stock). `off` = every product always shows the same number and never counts down;
 *  `onDelivery` / `onOrder` = real numbers that count down when an order is delivered / placed. With `sellWhenOut`, a product whose real stock
 *  is used up still shows the number and can still be ordered. */
export type StockRule = { countDown: "off" | "onDelivery" | "onOrder"; shown: number; sellWhenOut: boolean };

/** Public answers (shop, search, cart) only: returns a copy with every `stock_quantity` replaced as the rule says; the original (which may be cached) is never changed. */
export function maskStock<T>(value: T, rule: StockRule): T {
  const fix = (n: number) => (rule.countDown === "off" || (rule.sellWhenOut && n <= 0) ? rule.shown : n);
  const walk = (v: any): any => {
    if (Array.isArray(v)) {
      let out: any[] | null = null;
      v.forEach((x, i) => { const y = walk(x); if (y !== x) { out ??= v.slice(); out[i] = y; } });
      return out ?? v;
    }
    if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
      let out: any = null;
      for (const k of Object.keys(v)) {
        const x = v[k];
        const y = k === "stock_quantity" && typeof x === "number" ? fix(x) : walk(x);
        if (y !== x) { out ??= { ...v }; out[k] = y; }
      }
      return out ?? v;
    }
    return v;
  };
  return walk(value);
}

export const stockRule = async (): Promise<StockRule> => (await loadStore()).stock;
