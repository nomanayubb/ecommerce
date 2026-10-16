"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductSummary } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";

const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); }; // the card is a link: these buttons must not open the product by themselves

/**
 * The two options that appear when the pointer is on a card, in the free strip under the picture frame and lined up with its edges, so the
 * product itself is never covered: View product (outlined) on top, then quantity with a solid gold Add to Cart below. While the panel shows,
 * the small logo mark and the corner tag fade out (globals.css). Touch screens, which cannot hover, always show it.
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
  const step = "grid h-full w-6 place-items-center text-sm leading-none text-fg transition hover:text-accent disabled:opacity-40";
  return (
    <div onClick={stop} className="card-add-bar absolute inset-x-[10%] bottom-[4%] z-10 flex flex-col gap-[5px]">
      <button
        type="button" aria-label={`View ${p.title}`} onClick={(e) => { stop(e); router.push(`/products/${p.slug}`); }}
        className="flex h-6 items-center justify-center gap-1.5 bg-fg text-[0.56rem] font-bold uppercase tracking-[0.2em] text-bg shadow-[0_8px_18px_-10px_rgb(0_0_0/.9)] transition hover:bg-[rgb(var(--accent-bright))] hover:text-onbrand"
      >
        View product <span aria-hidden>→</span>
      </button>
      {canAdd && (
        <div className="flex h-7 items-stretch shadow-[0_10px_22px_-12px_rgb(0_0_0/.9)]">
          <div className="flex items-stretch border border-r-0 border-accent/50 bg-bg/95" role="group" aria-label="Quantity">
            <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={(e) => { stop(e); setQty((n) => Math.max(1, n - 1)); }} className={step}>−</button>
            <span className="grid w-5 place-items-center text-[0.68rem] font-semibold tabular-nums" aria-live="polite">{qty}</span>
            <button type="button" aria-label="Increase quantity" disabled={qty >= max} onClick={(e) => { stop(e); setQty((n) => Math.min(max, n + 1)); }} className={step}>+</button>
          </div>
          <button
            type="button" aria-label={`Add ${qty} of ${p.title} to cart`}
            onClick={(e) => {
              stop(e);
              add({ productId: p.id, variantId: null, title: p.title, price: Number(p.selling_price), marked: Number(p.marked_price), image: p.images[0], quantity: qty });
              setDone(true); setQty(1); setTimeout(() => setDone(false), 1600);
            }}
            className="flex flex-1 items-center justify-center gap-1.5 bg-[linear-gradient(90deg,rgb(var(--accent)),rgb(var(--accent-bright)))] text-[0.58rem] font-bold uppercase tracking-[0.16em] text-onbrand transition hover:brightness-110"
          >
            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {done ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><path d="M3 4h2.2l2 9.4c.1.5.5.8 1 .8h8.6c.5 0 .9-.3 1-.8L19.4 8H6" /><circle cx="9.5" cy="18.6" r="1.1" /><circle cx="16.5" cy="18.6" r="1.1" /></>}
            </svg>
            {done ? "Added" : "Add to Cart"}
          </button>
        </div>
      )}
    </div>
  );
}
