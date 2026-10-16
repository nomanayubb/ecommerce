"use client";

import { useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";
import { toLite, useShopper } from "./Shopper";

const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); }; // the card is a link: these buttons must not open the product by themselves

/**
 * The two options that appear when the pointer is on a card, in one joined bar along the bottom edge inside the frame, so it crosses none of the ring lines or the AVERIXA mark. Left to right: a chrome QUICK VIEW button with an eye,
 * the quantity box, and Add to Cart. Touch screens, which cannot hover, always show the row.
 * Add to Cart and the quantity only for simple products (no options, no minimum order, in stock); every card gets Quick view.
 */
export function CardAdd({ p }: { p: ProductSummary }) {
  const { add } = useCart();
  const { store } = useSite();
  const shopper = useShopper();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const canAdd = (p.show_add_to_cart ?? store.pdp?.showAddToCart ?? true) !== false && p.stock_quantity > 0 && !p.has_variants && (p.moq ?? 1) <= 1;
  const max = Math.max(1, Math.min(p.stock_quantity, 99));
  const step = "grid h-full w-4 place-items-center text-[0.8rem] leading-none text-fg transition hover:text-accent disabled:opacity-40";
  return (
    <div onClick={stop} className="card-add-bar absolute inset-x-[10%] bottom-[calc(22%+6px)] z-10 flex h-[26px] items-stretch gap-px border border-accent/70 bg-accent/40 shadow-[0_8px_18px_-8px_rgb(0_0_0/.75)]">
      <button
        type="button" aria-label={`Quick view ${p.title}`} onClick={(e) => { stop(e); shopper.openQuick(toLite(p)); }}
        className="flex items-center justify-center gap-1 bg-[linear-gradient(180deg,#fcfcfd_0%,#d8dbe1_46%,#9ca0aa_52%,#e3e5ea_100%)] px-2 whitespace-nowrap text-[0.5rem] font-bold uppercase tracking-[0.12em] text-[#1b1c1f] shadow-[inset_0_1px_0_rgb(255_255_255/.85)] transition hover:brightness-105"
        style={{ flex: canAdd ? "0 0 auto" : "1 1 auto" }}
      >
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
        Quick view
      </button>
      {canAdd && (
        <>
          <div className="flex items-stretch bg-[rgb(18_18_20)]" role="group" aria-label="Quantity">
            <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={(e) => { stop(e); setQty((n) => Math.max(1, n - 1)); }} className={step}>−</button>
            <span className="grid w-4 place-items-center text-[0.62rem] font-semibold tabular-nums" aria-live="polite">{qty}</span>
            <button type="button" aria-label="Increase quantity" disabled={qty >= max} onClick={(e) => { stop(e); setQty((n) => Math.min(max, n + 1)); }} className={step}>+</button>
          </div>
          <button
            type="button" aria-label={`Add ${qty} of ${p.title} to cart`}
            onClick={(e) => {
              stop(e);
              add({ productId: p.id, variantId: null, title: p.title, price: Number(p.selling_price), marked: Number(p.marked_price), image: p.images[0], quantity: qty });
              setDone(true); setQty(1); setTimeout(() => setDone(false), 1600);
            }}
            className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap bg-[rgb(18_18_20)] px-1.5 text-[0.5rem] font-bold uppercase tracking-[0.12em] text-[rgb(var(--accent-bright))] transition hover:bg-[rgb(var(--accent))] hover:text-onbrand"
          >
            <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {done ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><path d="M3 4h2.2l2 9.4c.1.5.5.8 1 .8h8.6c.5 0 .9-.3 1-.8L19.4 8H6" /><circle cx="9.5" cy="18.6" r="1.1" /><circle cx="16.5" cy="18.6" r="1.1" /></>}
            </svg>
            {done ? "Added" : "Add to Cart"}
          </button>
        </>
      )}
    </div>
  );
}
