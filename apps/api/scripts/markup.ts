// The shop's price rule for products bought from KK Mart: a sliding mark-up on the buying price.
//   up to 999        +70 %      100,000 to 299,999   +20 %
//   1,000 to 1,999   +50 %      300,000 to 700,000   +13 %
//   2,000 to 9,999   +40 %      above 700,000        no change (no rule given)
//   10,000 to 49,999 +30 %
//   50,000 to 99,999 +25 %
// The tier is picked from the price before the increase. Result is rounded to a whole rupee.
export const MARKUP_TIERS: { upTo: number; pct: number }[] = [
  { upTo: 999, pct: 70 }, { upTo: 1999, pct: 50 }, { upTo: 9999, pct: 40 }, { upTo: 49999, pct: 30 },
  { upTo: 99999, pct: 25 }, { upTo: 299999, pct: 20 }, { upTo: 700000, pct: 13 },
];

export function markupPct(price: number): number {
  if (!(price > 0)) return 0;
  return MARKUP_TIERS.find((t) => price <= t.upTo + 0.999)?.pct ?? 0;
}
export const marked = (price: number): number => Math.round(price * (1 + markupPct(price) / 100));
