"use client";

import { useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";

/**
 * One small add-to-bag button on the same line as the price, at the right. It is drawn in the card's own grey (hairline border, grey cart sign,
 * no fill and no gold) so it blends into the info box. Shown only for simple products (no options, no minimum order, in stock).
 */
export function CardAdd({ p }: { p: ProductSummary }) {
  const { add } = useCart();
  const { store } = useSite();
  const [done, setDone] = useState(false);
  const canAdd = (p.show_add_to_cart ?? store.pdp?.showAddToCart ?? true) !== false && p.stock_quantity > 0 && !p.has_variants && (p.moq ?? 1) <= 1;
  if (!canAdd) return null;
  return (
    <button
      type="button" aria-label={`Add ${p.title} to bag`}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation(); // the card is a link: adding must not open the product
        add({ productId: p.id, variantId: null, title: p.title, price: Number(p.selling_price), marked: Number(p.marked_price), image: p.images[0], quantity: 1 });
        setDone(true); setTimeout(() => setDone(false), 1600);
      }}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-line text-muted transition hover:border-fg/30 hover:text-fg"
    >
      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {done ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><path d="M3 4h2.2l2 9.4c.1.5.5.8 1 .8h8.6c.5 0 .9-.3 1-.8L19.4 8H6" /><circle cx="9.5" cy="18.6" r="1.1" /><circle cx="16.5" cy="18.6" r="1.1" /><path d="M13 5.5v3.6M11.2 7.3h3.6" /></>}
      </svg>
    </button>
  );
}
