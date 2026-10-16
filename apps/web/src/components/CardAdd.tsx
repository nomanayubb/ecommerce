"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";

const BTN = 74; // about the width of the button in pixels
const GAP = 12;

/**
 * One small add-to-bag button on the price line, at the right, in the card's own grey. It never makes the card taller: it is shorter than the
 * price line and it stays on that line. If a long price (with a crossed-out price) leaves no room for it, it is hidden rather than squeezed in.
 * Shown only for simple products (no options, no minimum order, in stock).
 */
export function CardAdd({ p }: { p: ProductSummary }) {
  const { add } = useCart();
  const { store } = useSite();
  const [done, setDone] = useState(false);
  const [fits, setFits] = useState(true);
  const ref = useRef<HTMLButtonElement>(null);
  const canAdd = (p.show_add_to_cart ?? store.pdp?.showAddToCart ?? true) !== false && p.stock_quantity > 0 && !p.has_variants && (p.moq ?? 1) <= 1;

  useLayoutEffect(() => {
    const row = ref.current?.parentElement;
    const block = row?.firstElementChild as HTMLElement | null;
    if (!row || !block) return;
    const check = () => setFits(block.scrollWidth + GAP + BTN <= row.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(row);
    return () => ro.disconnect();
  }, [canAdd]);

  if (!canAdd) return null;
  return (
    <button
      ref={ref} type="button" aria-label={`Add ${p.title} to bag`}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation(); // the card is a link: adding must not open the product
        add({ productId: p.id, variantId: null, title: p.title, price: Number(p.selling_price), marked: Number(p.marked_price), image: p.images[0], quantity: 1 });
        setDone(true); setTimeout(() => setDone(false), 1600);
      }}
      className={`${fits ? "flex" : "hidden"} ml-auto h-[18px] shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border border-line px-1 text-[0.46rem] font-semibold uppercase tracking-[0.06em] text-muted transition hover:border-fg/30 hover:text-fg`}
    >
      {done ? "Added" : "Add to Cart"}
    </button>
  );
}
