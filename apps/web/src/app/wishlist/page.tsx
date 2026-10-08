"use client";

import Link from "next/link";
import { useShopper } from "@/components/Shopper";
import { LiteCard } from "@/components/RecentlyViewed";

export default function Wishlist() {
  const { wish, toggleWish } = useShopper();
  return (
    <>
      <div className="mb-8 border-b border-line pb-6">
        <p className="eyebrow">Saved for later</p>
        <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Wishlist <span className="text-accent">({wish.length})</span></h1>
      </div>
      {wish.length === 0 ? (
        <div className="border border-dashed border-line py-24 text-center">
          <p className="eyebrow">Nothing saved yet</p>
          <p className="mt-3 text-muted">Tap the heart on any product to keep it here.</p>
          <Link href="/products" className="btn btn-primary mt-6">Browse the collection</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {wish.map((p) => <LiteCard key={p.slug} p={p} onRemove={() => toggleWish(p)} />)}
        </div>
      )}
    </>
  );
}
