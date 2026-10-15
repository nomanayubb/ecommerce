"use client";

import { useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";
import { toLite, useShopper } from "./Shopper";
import { CheckIcon, CompareIcon, HeartIcon } from "./icons";

/** Three small buttons in a column at the right of the price: save (heart), compare, add to bag. */
export function CardTools({ p }: { p: ProductSummary }) {
  const s = useShopper();
  const { add } = useCart();
  const { store } = useSite();
  const [done, setDone] = useState(false);
  const saved = s.inWish(p.slug), compared = s.inCompare(p.slug);
  const lite = toLite(p);
  const canAdd = (p.show_add_to_cart ?? store.pdp?.showAddToCart ?? true) !== false && p.stock_quantity > 0 && !p.has_variants && (p.moq ?? 1) <= 1;
  const btn = "glass flex h-8 w-8 items-center justify-center transition hover:text-accent";
  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
      <button type="button" aria-pressed={saved} aria-label={saved ? `Remove ${p.title} from wishlist` : `Save ${p.title} to wishlist`} className={`${btn} ${saved ? "text-accent" : ""}`} onClick={() => s.toggleWish(lite)}>
        <HeartIcon size={16} filled={saved} />
      </button>
      <button type="button" aria-pressed={compared} aria-label={compared ? `Remove ${p.title} from compare` : `Compare ${p.title}`} className={`${btn} ${compared ? "text-accent" : ""}`} onClick={() => s.toggleCompare(lite)}>
        <CompareIcon size={16} />
      </button>
      {canAdd && (
        <button
          type="button" aria-label={`Add ${p.title} to bag`} className={btn}
          onClick={() => { add({ productId: p.id, variantId: null, title: p.title, price: Number(p.selling_price), marked: Number(p.marked_price), image: p.images[0], quantity: 1 }); setDone(true); setTimeout(() => setDone(false), 1600); }}
        >
          {done ? <CheckIcon size={16} /> : <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="square" aria-hidden><path d="M5 8h14l-1 12H6L5 8z" /><path d="M12 11v6M9 14h6" stroke="rgb(var(--accent))" /></svg>}
        </button>
      )}
    </div>
  );
}
