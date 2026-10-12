"use client";

import { useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { useCart } from "./CartProvider";
import { CheckIcon } from "./icons";

/** One-tap add for simple products (no options, no minimum order). Sits at the bottom-right of the photo. */
export function QuickAdd({ p }: { p: ProductSummary }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  if (p.stock_quantity <= 0 || p.has_variants || (p.moq ?? 1) > 1) return null;
  return (
    <button
      type="button" aria-label={`Add ${p.title} to bag`}
      onClick={() => { add({ productId: p.id, variantId: null, title: p.title, price: Number(p.selling_price), image: p.images[0], quantity: 1 }); setDone(true); setTimeout(() => setDone(false), 1600); }}
      className="quick-add glass absolute right-3 z-10 flex h-10 w-10 items-center justify-center transition hover:text-accent"
      style={{ top: "calc(var(--img-ratio, 125) * 1cqw - 3.3rem)" }}
    >
      {done ? <CheckIcon size={18} /> : <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="square" aria-hidden><path d="M5 8h14l-1 12H6L5 8z" /><path d="M12 11v6M9 14h6" stroke="rgb(var(--accent))" /></svg>}
    </button>
  );
}
