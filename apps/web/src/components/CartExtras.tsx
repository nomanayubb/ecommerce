"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pkr, type ProductSummary } from "@/lib/api";
import { send } from "@/lib/client";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";
import { CheckIcon, CloseIcon } from "./icons";
import { GiftIcon } from "./icons/set";

/** Totals exactly as the server will charge them (prices, tiers, coupon, delivery, gift wrap). */
export interface Priced {
  subtotal: number;
  discount: number;
  coupon: { code: string; label: string } | null;
  couponError: string | null;
  shippingFee: number;
  giftWrap: boolean;
  giftWrapFee: number;
  grandTotal: number;
  freeShippingRemaining: number;
}

export function useCartPricing() {
  const { lines, extras } = useCart();
  const [priced, setPriced] = useState<Priced | null>(null);
  const [error, setError] = useState("");
  const key = JSON.stringify({ i: lines.map((l) => [l.productId, l.variantId, l.quantity]), c: extras.coupon, g: extras.giftWrap });
  useEffect(() => {
    if (!lines.length) { setPriced(null); setError(""); return; }
    const { i, c, g } = JSON.parse(key) as { i: [string, string | null, number][]; c: string; g: boolean };
    const t = setTimeout(() => {
      send<Priced>("POST", "cart/validate", { items: i.map(([productId, variantId, quantity]) => ({ productId, variantId, quantity })), couponCode: c || undefined, giftWrap: g || undefined })
        .then((r) => { setPriced(r); setError(""); })
        .catch((e) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [key, lines.length]);
  return { priced, error };
}

/** Promo code box with instant feedback (green when applied, reason when not). */
export function PromoField({ priced }: { priced: Priced | null }) {
  const { extras, setExtras } = useCart();
  const [draft, setDraft] = useState("");
  const applied = priced?.coupon;
  const bad = extras.coupon && priced?.couponError;
  if (applied) {
    return (
      <div className="flex items-center justify-between border border-accent bg-accent/5 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 text-accent"><CheckIcon size={16} /><strong>{applied.code}</strong> · {applied.label}</span>
        <button type="button" onClick={() => { setExtras({ coupon: "" }); setDraft(""); }} aria-label="Remove promo code" className="p-1 text-muted hover:text-accent"><CloseIcon size={14} /></button>
      </div>
    );
  }
  return (
    <div>
      <div className="flex">
        <input
          value={draft || (bad ? extras.coupon : "")} onChange={(e) => setDraft(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} maxLength={30}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (draft) setExtras({ coupon: draft }); } }}
          placeholder="Promo code" aria-label="Promo code" aria-invalid={!!bad}
          className="min-w-0 flex-1 border border-line bg-transparent px-3 py-2.5 text-sm uppercase tracking-widest outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:border-accent"
        />
        <button type="button" disabled={!draft} onClick={() => setExtras({ coupon: draft })} className="btn btn-ghost !px-4 !py-2.5 disabled:opacity-40">Apply</button>
      </div>
      {bad && <p role="alert" className="mt-2 text-xs text-red-400">{priced?.couponError}</p>}
    </div>
  );
}

/** Order note + gift wrap with a message. Gift wrap only appears when the store turns it on. */
export function GiftOptions() {
  const { extras, setExtras } = useCart();
  const { store } = useSite();
  return (
    <details className="group border border-line" open={!!(extras.giftWrap || extras.note)}>
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.2em]"><GiftIcon size={16} />Gift &amp; notes</summary>
      <div className="space-y-3 border-t border-line p-3">
        {store.giftWrapEnabled && (
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={extras.giftWrap} onChange={(e) => setExtras({ giftWrap: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--accent))]" />
            Gift wrap {store.giftWrapFee > 0 ? `(+${pkr(store.giftWrapFee)})` : "(free)"}
          </label>
        )}
        {store.giftWrapEnabled && extras.giftWrap && (
          <textarea value={extras.giftMessage} onChange={(e) => setExtras({ giftMessage: e.target.value.slice(0, 300) })} rows={2} placeholder="Gift message (printed on a card, no prices shown)" aria-label="Gift message" className="w-full border border-line bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent" />
        )}
        <textarea value={extras.note} onChange={(e) => setExtras({ note: e.target.value.slice(0, 500) })} rows={2} placeholder="Note for the seller (optional)" aria-label="Order note" className="w-full border border-line bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent" />
      </div>
    </details>
  );
}

type Rec = ProductSummary & { moq: number; has_variants: boolean };

/** "Complete your order": same-category products with a one-tap add. */
export function Upsells() {
  const { lines, add } = useCart();
  const [items, setItems] = useState<Rec[]>([]);
  const ids = [...new Set(lines.map((l) => l.productId))].join(",");
  useEffect(() => {
    if (!ids) { setItems([]); return; }
    let live = true;
    send<{ items: Rec[] }>("GET", `products/recommend?ids=${ids}&limit=4`).then((r) => live && setItems(r.items)).catch(() => {});
    return () => { live = false; };
  }, [ids]);
  if (!items.length) return null;
  return (
    <section aria-label="You may also like" className="border-t border-line py-5">
      <p className="eyebrow mb-3 !text-[0.65rem]">Complete your order</p>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {items.map((p) => {
          const direct = !p.has_variants && p.moq <= 1;
          return (
            <li key={p.id} className="w-32 shrink-0 text-xs">
              <Link href={`/products/${p.slug}`} className="block">
                {p.images[0] && <img src={p.images[0]} alt="" width={128} height={160} loading="lazy" className="aspect-[4/5] w-full border border-line object-cover" />}
                <p className="mt-2 line-clamp-2 leading-snug">{p.title}</p>
              </Link>
              <p className="mt-1 font-semibold">{pkr(p.selling_price)}</p>
              {direct ? (
                <button type="button" className="mt-2 w-full border border-line py-1.5 text-[0.65rem] font-semibold uppercase tracking-widest transition hover:border-accent hover:text-accent"
                  onClick={() => add({ productId: p.id, variantId: null, title: p.title, price: Number(p.selling_price), image: p.images[0], quantity: 1 })}>Add</button>
              ) : (
                <Link href={`/products/${p.slug}`} className="mt-2 block w-full border border-line py-1.5 text-center text-[0.65rem] font-semibold uppercase tracking-widest transition hover:border-accent hover:text-accent">Choose</Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
