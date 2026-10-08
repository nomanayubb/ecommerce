"use client";

import Link from "next/link";
import { useState } from "react";
import { pkr } from "@/lib/api";
import type { Bundle } from "@/lib/content";
import { mascotSay } from "@/lib/motion";
import { useCart } from "./CartProvider";
import { CheckIcon } from "./icons";

/** Adds a whole curated set to the bag. Products with options or a minimum order are skipped and linked instead. */
export function BundleAdd({ b }: { b: Bundle }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const direct = b.items.filter((i) => i.product.stock_quantity >= i.qty && !i.product.has_variants && i.product.moq <= i.qty);
  const skipped = b.items.filter((i) => !direct.includes(i));
  return (
    <div>
      <button disabled={!direct.length} onClick={() => { direct.forEach((i) => add({ productId: i.product.id, variantId: null, title: i.product.title, price: Number(i.product.selling_price), image: i.product.image ?? undefined, quantity: i.qty })); setDone(true); mascotSay("celebrate", "The whole set is in your bag"); setTimeout(() => setDone(false), 2500); }} className="btn btn-primary w-full disabled:opacity-40">
        {done ? <><CheckIcon size={16} /> Added</> : `Add the set to bag · ${pkr(direct.reduce((s, i) => s + Number(i.product.selling_price) * i.qty, 0))}`}
      </button>
      {skipped.length > 0 && (
        <p className="mt-3 text-xs text-muted">Choose options for: {skipped.map((i, n) => <span key={i.slug}>{n ? ", " : ""}<Link href={`/products/${i.slug}`} className="text-accent hover:underline">{i.product.title}</Link></span>)} (sold out or needs a size/colour).</p>
      )}
    </div>
  );
}
