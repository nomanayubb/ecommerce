"use client";

import { useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";

const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); }; // the card is a link: these buttons must not open the product

/**
 * Quantity box and Add to Cart over the bottom of the product picture. The bar slides up when the card is pointed at (always visible on touch
 * screens), so it takes no room in the card and cannot touch the name or the prices. Shown only for simple products (no options, no minimum order, in stock).
 */
export function CardAdd({ p }: { p: ProductSummary }) {
  const { add } = useCart();
  const { store } = useSite();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const canAdd = (p.show_add_to_cart ?? store.pdp?.showAddToCart ?? true) !== false && p.stock_quantity > 0 && !p.has_variants && (p.moq ?? 1) <= 1;
  if (!canAdd) return null;
  const max = Math.max(1, Math.min(p.stock_quantity, 99));
  const step = "grid h-full w-7 place-items-center text-sm leading-none text-fg transition hover:text-accent disabled:opacity-40";
  return (
    <div
      onClick={stop}
      className="card-add-bar absolute inset-x-[6%] bottom-[5%] z-10 flex h-9 translate-y-2 items-stretch border border-accent/60 bg-bg/90 opacity-0 shadow-[0_10px_24px_-12px_rgb(0_0_0/.9)] backdrop-blur transition duration-300 focus-within:translate-y-0 focus-within:opacity-100 group-hover/card:translate-y-0 group-hover/card:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"
    >
      <div className="flex items-stretch border-r border-accent/40" role="group" aria-label="Quantity">
        <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={(e) => { stop(e); setQty((n) => Math.max(1, n - 1)); }} className={step}>−</button>
        <span className="grid w-6 place-items-center text-xs font-semibold tabular-nums" aria-live="polite">{qty}</span>
        <button type="button" aria-label="Increase quantity" disabled={qty >= max} onClick={(e) => { stop(e); setQty((n) => Math.min(max, n + 1)); }} className={step}>+</button>
      </div>
      <button
        type="button" aria-label={`Add ${qty} of ${p.title} to cart`}
        onClick={(e) => {
          stop(e);
          add({ productId: p.id, variantId: null, title: p.title, price: Number(p.selling_price), marked: Number(p.marked_price), image: p.images[0], quantity: qty });
          setDone(true); setQty(1); setTimeout(() => setDone(false), 1600);
        }}
        className="flex flex-1 items-center justify-center gap-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-accent transition hover:bg-accent hover:text-onbrand"
      >
        <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {done ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><path d="M3 4h2.2l2 9.4c.1.5.5.8 1 .8h8.6c.5 0 .9-.3 1-.8L19.4 8H6" /><circle cx="9.5" cy="18.6" r="1.1" /><circle cx="16.5" cy="18.6" r="1.1" /></>}
        </svg>
        {done ? "Added" : "Add to Cart"}
      </button>
    </div>
  );
}
