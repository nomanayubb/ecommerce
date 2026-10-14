"use client";

import Link from "next/link";
import { useEffect } from "react";
import { pkr } from "@/lib/api";
import { useShopper, type Lite } from "./Shopper";
import { ImageMark } from "./ImageMark";

/** Small card used by wishlist and recently viewed. */
export function LiteCard({ p, onRemove }: { p: Lite; onRemove?: () => void }) {
  const off = p.marked > p.price ? Math.round(((p.marked - p.price) / p.marked) * 100) : 0;
  return (
    <div className="lift group relative border border-line bg-card">
      <Link href={`/products/${p.slug}`} className="pcard block">
        <div className="pcard-img pcard-stage relative aspect-[4/5] overflow-hidden">
          <span className="pcard-ring" aria-hidden />
          <div className={`pcard-disc ${p.image?.includes("/kk/c/") ? "is-cut" : ""}`}>
            <ImageMark behind />
            {p.image && <img src={p.image} alt={p.title} loading="lazy" decoding="async" width={600} height={750} className="pcard-photo relative" />}
          </div>
          <span className="pcard-shadow" aria-hidden />
          <ImageMark />
          {off > 0 && <span className="absolute left-0 top-4 bg-accent px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-onbrand">-{off}%</span>}
        </div>
        <div className="p-4">
          {p.brand && <p className="eyebrow !text-[0.6rem] !text-muted">{p.brand}</p>}
          <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5">{p.title}</h3>
          <p className="mt-2 flex items-baseline gap-2"><span className="font-semibold">{pkr(p.price)}</span>{off > 0 && <span className="text-xs text-muted line-through">{pkr(p.marked)}</span>}</p>
        </div>
      </Link>
      {onRemove && <button onClick={onRemove} className="absolute inset-x-0 bottom-0 translate-y-full border-t border-line bg-card py-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted transition hover:text-accent group-hover:translate-y-0 focus-visible:translate-y-0" aria-label={`Remove ${p.title}`}>Remove</button>}
    </div>
  );
}

/** Records the product being viewed. Renders nothing. */
export function RecordView({ p }: { p: Lite }) {
  const { pushRecent } = useShopper();
  useEffect(() => { pushRecent(p); }, [p.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Carousel/grid of recently viewed products (hidden when empty). */
export function RecentlyViewed({ exclude, title = "Recently viewed" }: { exclude?: string; title?: string }) {
  const { recent } = useShopper();
  const items = recent.filter((r) => r.slug !== exclude).slice(0, 5);
  if (!items.length) return null;
  return (
    <section className="mt-20" aria-label={title}>
      <div className="mb-6"><p className="eyebrow">Pick up where you left off</p><h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">{title}</h2></div>
      <div className="flex snap-x gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible">
        {items.map((p) => <div key={p.slug} className="w-44 shrink-0 snap-start md:w-auto"><LiteCard p={p} /></div>)}
      </div>
    </section>
  );
}
