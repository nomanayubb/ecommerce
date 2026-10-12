"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { pkr, type ProductDetail } from "@/lib/api";
import { send } from "@/lib/client";
import { useShopper, type Lite } from "@/components/Shopper";
import { LiteCard } from "@/components/RecentlyViewed";
import { MascotFigure } from "@/components/Mascot";
import { useCart } from "@/components/CartProvider";

const toLite = (p: ProductDetail): Lite => ({ id: p.id, slug: p.slug, title: p.title, price: Number(p.selling_price), marked: Number(p.marked_price), image: p.images?.[0], brand: p.brand_name });

function Page() {
  const { wish, toggleWish } = useShopper();
  const shared = useSearchParams().get("items");
  const sharedSlugs = useMemo(() => (shared ? shared.split(",").filter((s) => /^[a-z0-9-]{1,100}$/.test(s)).slice(0, 24) : []), [shared]);
  const [now, setNow] = useState<Record<string, ProductDetail | null>>({});
  const [sharedItems, setSharedItems] = useState<Lite[]>([]);
  const [copied, setCopied] = useState(false);
  const [sort, setSort] = useState<"new" | "asc" | "desc">("new");
  const { add } = useCart();

  // Today's prices for saved items (to spot price drops); only a handful of light requests.
  useEffect(() => {
    wish.slice(0, 16).filter((w) => !(w.slug in now)).forEach((w) => send<ProductDetail>("GET", `products/${w.slug}`).then((p) => setNow((c) => ({ ...c, [w.slug]: p }))).catch(() => setNow((c) => ({ ...c, [w.slug]: null }))));
  }, [wish]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sharedSlugs.length) return;
    Promise.all(sharedSlugs.map((s) => send<ProductDetail>("GET", `products/${s}`).then(toLite).catch(() => null))).then((l) => setSharedItems(l.filter(Boolean) as Lite[]));
  }, [sharedSlugs]);

  const sorted = useMemo(() => (sort === "new" ? [...wish].reverse() : [...wish].sort((a, b) => (sort === "asc" ? a.price - b.price : b.price - a.price))), [wish, sort]);
  const eligible = wish.map((w) => now[w.slug]).filter((d): d is ProductDetail => !!d && !d.variants.length && d.stock_quantity > 0 && d.moq <= 1);
  const link = () => `${location.origin}/wishlist?items=${wish.map((w) => w.slug).join(",")}`;
  const share = async () => {
    const url = link();
    try { if (navigator.share) await navigator.share({ title: "My wishlist", url }); else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2200); } } catch {}
  };

  if (shared) {
    return (
      <>
        <div className="mb-8 border-b border-line pb-6"><p className="eyebrow">Shared with you</p><h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Someone&apos;s wishlist</h1></div>
        {sharedItems.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{sharedItems.map((p) => <LiteCard key={p.slug} p={p} onRemove={() => toggleWish(p)} />)}</div> : <p className="text-muted">Loading…</p>}
        <p className="mt-8 text-sm text-muted">Tap the heart on an item to save it to <Link href="/wishlist" className="text-accent hover:underline">your own wishlist</Link>.</p>
      </>
    );
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div><p className="eyebrow">Saved for later</p><h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Wishlist <span className="text-accent">({wish.length})</span></h1></div>
        {wish.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort wishlist" className="border border-line bg-card px-3 py-2.5 text-xs uppercase tracking-widest"><option value="new">Newest first</option><option value="asc">Price: low to high</option><option value="desc">Price: high to low</option></select>
            {eligible.length > 0 && <button onClick={() => eligible.forEach((d) => add({ productId: d.id, variantId: null, title: d.title, price: Number(d.selling_price), image: d.images[0], quantity: 1 }))} className="btn btn-primary">Add {eligible.length} to bag</button>}
            <button onClick={share} className="btn btn-ghost">{copied ? "Link copied" : "Share my wishlist"}</button>
          </div>
        )}
      </div>
      {wish.length === 0 ? (
        <div className="border border-dashed border-line py-24 text-center">
          <MascotFigure mood="sad" size={96} className="mx-auto mb-4 text-fg" />
          <p className="eyebrow">Nothing saved yet</p>
          <p className="mt-3 text-muted">Tap the heart on any product to keep it here.</p>
          <Link href="/products" className="btn btn-primary mt-6">Browse the collection</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {sorted.map((p) => {
            const cur = now[p.slug];
            const drop = cur && Number(cur.selling_price) < p.price ? p.price - Number(cur.selling_price) : 0;
            const gone = cur === null;
            return (
              <div key={p.slug} className="relative">
                <LiteCard p={drop && cur ? { ...p, price: Number(cur.selling_price) } : p} onRemove={() => toggleWish(p)} />
                {drop > 0 && <span className="absolute left-0 top-3 bg-gold px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-widest text-darksurface">Price dropped {pkr(drop)}</span>}
                {gone && <span className="glass absolute left-3 top-3 px-2 py-1 text-[0.6rem] uppercase tracking-widest">No longer available</span>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function Wishlist() {
  return <Suspense fallback={<p className="text-muted">Loading…</p>}><Page /></Suspense>;
}
