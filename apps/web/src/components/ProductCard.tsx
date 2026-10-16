import Link from "next/link";
import { pkr, type ProductSummary } from "@/lib/api";
import { Tilt } from "./Motion";
import { Stars } from "./Stars";
import { TagIcons } from "./TagIcons";
import { HoverVideo } from "./HoverVideo";
import { CardGlow, HoverPhoto, PriceTag } from "./CardFx";
import { ImageMark } from "./ImageMark";
import { CardAdd } from "./CardAdd";
import { isFileVideo } from "@/lib/media";

const TAG_BADGES: [string, string][] = [["bestseller", "Bestseller"], ["limited", "Limited"], ["new", "New"]];

export function ProductCard({ p, priority = false }: { p: ProductSummary; priority?: boolean }) {
  const soldOut = p.stock_quantity === 0;
  const badge = TAG_BADGES.find(([t]) => p.tags?.includes(t))?.[1] ?? ((p.sold_30d ?? 0) >= 3 ? "Popular" : p.is_new ? "New" : null) ?? (p.stock_quantity > 0 && p.stock_quantity <= 5 ? "Low stock" : null);
  const lowStock = !badge && p.stock_quantity > 0 && p.stock_quantity <= 5;
  return (
    <Tilt>
      <div className="group/card relative [container-type:inline-size]">
      <Link href={`/products/${p.slug}`} className="lift pcard group block border border-line bg-card">
        <div className="pcard-img pcard-stage relative aspect-[4/5] overflow-hidden">
          <span className="pcard-ring" aria-hidden />
          <div className={`pcard-disc ${p.images[0]?.includes("/kk/c/") ? "is-cut" : ""}`}>
            <ImageMark behind />
            {p.images[0] && (
              <img src={p.images[0]} alt={p.title} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" width={600} height={750}
                className={`pcard-photo relative ${soldOut ? "opacity-50 grayscale" : ""}`} />
            )}
            {p.images[1] && !soldOut && <HoverPhoto src={p.images[2] ?? p.images[1]} />}
          </div>
          <span className="pcard-shadow" aria-hidden />
          <ImageMark />
          <CardGlow image={p.images[0]} />
          {p.tags?.includes("recommended") && !soldOut && <span className="absolute left-0 top-14 bg-gold px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-darksurface">Recommended</span>}
          {isFileVideo(p.video_url) && !soldOut && <HoverVideo src={p.video_url!} />}
          {p.discount_pct && !soldOut && (
            <span className="badge-discount absolute left-0 top-4 bg-accent px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-onbrand">-{p.discount_pct}%</span>
          )}
          {(badge || lowStock) && !soldOut && (
            <span className="glass absolute bottom-3 left-3 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-fg">{badge ?? "Low stock"}</span>
          )}
          {soldOut && <span className="absolute inset-x-0 bottom-0 bg-bg/80 py-2 text-center text-[0.65rem] font-semibold uppercase tracking-[0.25em] backdrop-blur">Sold out</span>}
        </div>
        <div className="p-4">
          {p.brand_name && <p className="eyebrow !text-[0.6rem] !text-muted">{p.brand_name}</p>}
          <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5">{p.title}</h3>
          {!!p.recipe_count && <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-accent">In {p.recipe_count} recipe{p.recipe_count === 1 ? "" : "s"}</p>}
          {!!p.rating_count && <div className="mt-1.5"><Stars value={Number(p.rating_avg)} size={13} count={p.rating_count} /></div>}
          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <PriceTag value={Number(p.selling_price)} className="font-semibold" />
                {p.discount_pct && <span className="text-xs text-muted line-through">{pkr(p.marked_price)}</span>}
              </p>
              <TagIcons tags={p.tags} size={16} max={4} className="mt-2.5 text-muted" />
            </div>
            <CardAdd p={p} />
          </div>
          {!soldOut && p.stock_quantity > 0 && p.stock_quantity <= 10 && (
            <div className="mt-3" role="img" aria-label={`Only ${p.stock_quantity} left`}>
              <div className="h-0.5 w-full bg-line"><div className="stock-bar h-full bg-accent" style={{ width: `${Math.max(8, p.stock_quantity * 10)}%` }} /></div>
              <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-muted">Only {p.stock_quantity} left</p>
            </div>
          )}
        </div>
      </Link>
      </div>
    </Tilt>
  );
}
