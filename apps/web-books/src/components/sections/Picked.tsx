"use client";

import { useEffect, useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { send } from "@/lib/client";
import { ProductCard } from "../ProductCard";
import { useShopper } from "../Shopper";

/** Products related to what this visitor recently viewed. Shows nothing until they have viewed something. */
export function Picked({ eyebrow, heading }: { eyebrow: string; heading: string }) {
  const { recent } = useShopper();
  const [items, setItems] = useState<ProductSummary[]>([]);
  const ids = recent.slice(0, 4).map((r) => r.id).join(",");
  useEffect(() => {
    if (!ids) { setItems([]); return; }
    let live = true;
    send<{ items: ProductSummary[] }>("GET", `products/recommend?ids=${ids}&limit=4`).then((r) => live && setItems(r.items)).catch(() => {});
    return () => { live = false; };
  }, [ids]);
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-8">{eyebrow && <p className="eyebrow">{eyebrow}</p>}{heading && <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">{heading}</h2>}</div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </section>
  );
}
