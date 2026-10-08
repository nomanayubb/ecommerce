import Link from "next/link";
import { pkr, type ProductSummary } from "@/lib/api";
import { Tilt } from "./Motion";
import { CardActions } from "./CardActions";

const TAG_BADGES: [string, string][] = [["bestseller", "Bestseller"], ["limited", "Limited"], ["new", "New"]];

export function ProductCard({ p }: { p: ProductSummary }) {
  const soldOut = p.stock_quantity === 0;
  const badge = TAG_BADGES.find(([t]) => p.tags?.includes(t))?.[1] ?? (p.stock_quantity > 0 && p.stock_quantity <= 5 ? "Low stock" : null);
  return (
    <Tilt>
      <div className="group/card relative">
      <Link href={`/products/${p.slug}`} className="lift group block border border-line bg-card">
        <div className="relative aspect-[4/5] overflow-hidden bg-line/40">
          {p.images[0] && (
            <img src={p.images[0]} alt={p.title} loading="lazy" width={600} height={750}
              className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${soldOut ? "opacity-50 grayscale" : ""}`} />
          )}
          {p.discount_pct && !soldOut && (
            <span className="absolute left-0 top-4 bg-accent px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-onbrand">-{p.discount_pct}%</span>
          )}
          {badge && !soldOut && (
            <span className="glass absolute bottom-3 left-3 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-fg">{badge}</span>
          )}
          {soldOut && <span className="absolute inset-x-0 bottom-0 bg-bg/80 py-2 text-center text-[0.65rem] font-semibold uppercase tracking-[0.25em] backdrop-blur">Sold out</span>}
        </div>
        <div className="p-4">
          {p.brand_name && <p className="eyebrow !text-[0.6rem] !text-muted">{p.brand_name}</p>}
          <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5">{p.title}</h3>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-semibold">{pkr(p.selling_price)}</span>
            {p.discount_pct && <span className="text-xs text-muted line-through">{pkr(p.marked_price)}</span>}
          </p>
        </div>
      </Link>
      <CardActions p={p} />
      </div>
    </Tilt>
  );
}
