"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductSummary } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";

const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); }; // the card is a link: these buttons must not open the product by themselves

/**
 * The two options that appear when the pointer is on a card: Add to Cart (with a quantity box) and View product. They sit in one boxed panel in
 * the free strip under the picture frame, lined up with the frame's edges, so the product itself is never covered. While the panel shows, the
 * small logo mark and the corner tag fade out (see globals.css). Touch screens, which cannot hover, always show it.
 * Add to Cart only for simple products (no options, no minimum order, in stock); every card gets View product.
 */
export function CardAdd({ p }: { p: ProductSummary }) {
  const { add } = useCart();
  const { store } = useSite();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const canAdd = (p.show_add_to_cart ?? store.pdp?.showAddToCart ?? true) !== false && p.stock_quantity > 0 && !p.has_variants && (p.moq ?? 1) <= 1;
  const max = Math.max(1, Math.min(p.stock_quantity, 99));
  const step = "grid h-full w-7 place-items-center text-sm leading-none text-fg transition hover:text-accent disabled:opacity-40";
  return (
    <div onClick={stop} className="card-add-bar absolute inset-x-[10%] bottom-[4%] z-10 flex flex-col divide-y divide-accent/30 border border-accent/55 bg-bg/95 shadow-[0_12px_26px_-14px_rgb(0_0_0/.95)]">
      {canAdd && (
        <div className="flex h-7 items-stretch">
          <div className="flex items-stretch border-r border-accent/30" role="group" aria-label="Quantity">
            <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={(e) => { stop(e); setQty((n) => Math.max(1, n - 1)); }} className={step}>−</button>
            <span className="grid w-6 place-items-center text-[0.7rem] font-semibold tabular-nums" aria-live="polite">{qty}</span>
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
      )}
      <button
        type="button" aria-label={`View ${p.title}`} onClick={(e) => { stop(e); router.push(`/products/${p.slug}`); }}
        className="flex h-7 items-center justify-center gap-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-fg/85 transition hover:bg-fg/10 hover:text-accent"
      >
        View product <span aria-hidden>→</span>
      </button>
    </div>
  );
}
