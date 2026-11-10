"use client";

import { useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { toLite, useShopper } from "./Shopper";
import { CompareIcon, EyeIcon, HeartIcon } from "./icons";

/** Overlay controls on a product card: wishlist heart (with burst), compare toggle, quick view. */
export function CardActions({ p }: { p: ProductSummary }) {
  const s = useShopper();
  const [burst, setBurst] = useState(0);
  const saved = s.inWish(p.slug);
  const compared = s.inCompare(p.slug);
  const lite = toLite(p);
  const btn = "glass flex h-9 w-9 items-center justify-center transition hover:text-accent focus-visible:opacity-100";

  return (
    <>
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button
          type="button" aria-pressed={saved} aria-label={saved ? `Remove ${p.title} from wishlist` : `Save ${p.title} to wishlist`}
          className={`${btn} relative ${saved ? "text-accent" : ""}`}
          onClick={() => { if (s.toggleWish(lite)) setBurst((b) => b + 1); }}
        >
          <HeartIcon size={18} filled={saved} />
          {burst > 0 && saved && <span key={burst} aria-hidden className="heart-burst" />}
        </button>
        <button
          type="button" aria-pressed={compared} aria-label={compared ? `Remove ${p.title} from compare` : `Compare ${p.title}`}
          className={`${btn} ${compared ? "text-accent" : ""}`} onClick={() => s.toggleCompare(lite)}
        >
          <CompareIcon size={18} />
        </button>
      </div>
      <button
        type="button" onClick={() => s.openQuick(lite)} aria-label={`Quick view ${p.title}`}
        className="glass absolute inset-x-3 bottom-[7.5rem] flex translate-y-2 items-center justify-center gap-2 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-0 transition duration-300 hover:text-accent group-hover/card:translate-y-0 group-hover/card:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 max-md:hidden"
      >
        <EyeIcon size={16} /> Quick view
      </button>
    </>
  );
}
