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
      className="ml-auto flex h-[18px] shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border border-line px-1 text-[0.46rem] font-semibold uppercase tracking-[0.06em] text-muted transition hover:border-fg/30 hover:text-fg"
    >
      {done ? "Added" : "Add to Cart"}
    </button>
  );
}
