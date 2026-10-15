"use client";

import { useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";
import { CheckIcon } from "./icons";

/** One small add-to-bag button on the picture, level with the AVERIXA logo mark and just to its left. Shown only for simple products (no options, no minimum order, in stock). */
export function CardAdd({ p, className = "" }: { p: ProductSummary; className?: string }) {
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
      className={`glass flex h-8 w-8 shrink-0 items-center justify-center transition hover:text-accent ${className}`}
    >
      {done ? <CheckIcon size={16} /> : <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="square" aria-hidden><path d="M5 8h14l-1 12H6L5 8z" /><path d="M12 11v6M9 14h6" stroke="rgb(var(--accent))" /></svg>}
    </button>
  );
}
