"use client";

import { useMemo, useState } from "react";
import { pkr, type ProductDetail } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";
import { CashIcon, PackageIcon, SupportIcon, TruckIcon } from "./icons";

export function BuyPanel({ p }: { p: ProductDetail }) {
  const { add } = useCart();
  const { store } = useSite();
  const [variantId, setVariantId] = useState<string | null>(p.variants.find((v) => v.stock_quantity > 0)?.id ?? p.variants[0]?.id ?? null);
  const [qty, setQty] = useState(Math.max(1, p.moq));
  const [added, setAdded] = useState(false);

  const variant = p.variants.find((v) => v.id === variantId);
  const stock = variant ? variant.stock_quantity : p.stock_quantity;
  const unit = useMemo(() => {
    let price = Number(variant ? variant.price : p.selling_price);
    for (const t of p.priceTiers) if (qty >= t.min_qty) price = Math.min(price, Number(t.unit_price));
    return price;
  }, [variant, qty, p]);
  const marked = Number(p.marked_price);
  const saving = marked > unit ? Math.round(((marked - unit) / marked) * 100) : 0;
  const soldOut = stock === 0;
  const clamp = (n: number) => Math.min(Math.max(n, p.moq), stock || n);

  const addToBag = () => {
    add({ productId: p.id, variantId, title: variant ? `${p.title} - ${variant.title}` : p.title, price: unit, image: p.images[0], quantity: qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const cta = (
    <button disabled={soldOut || qty > stock} onClick={addToBag} className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40">
      {soldOut ? "Sold out" : added ? "Added ✓" : `Add to bag · ${pkr(unit * qty)}`}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-semibold">{pkr(unit)}</span>
        {saving > 0 && <>
          <span className="text-lg text-muted line-through">{pkr(marked)}</span>
          <span className="bg-accent px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-onbrand">Save {saving}%</span>
        </>}
      </div>

      <p className="flex items-center gap-2 text-sm" role="status">
        <span className={`h-2 w-2 rounded-full ${soldOut ? "bg-red-500" : stock <= 5 ? "bg-orange-400" : "bg-emerald-500"}`} />
        {soldOut ? "Currently unavailable" : stock <= 5 ? `Only ${stock} left in stock` : "In stock, ships within 1–2 days"}
      </p>

      {p.variants.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-3">Option{variant ? <span className="ml-2 normal-case tracking-normal text-fg">{variant.title}</span> : null}</legend>
          <div className="flex flex-wrap gap-2">
            {p.variants.map((v) => (
              <button key={v.id} onClick={() => setVariantId(v.id)} disabled={v.stock_quantity === 0} aria-pressed={v.id === variantId}
                className={`min-w-14 border px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through ${v.id === variantId ? "border-accent bg-accent/10 text-accent" : "border-line hover:border-fg/50"}`}>
                {v.title}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {p.priceTiers.length > 0 && (
        <div className="border border-line bg-card p-4">
          <p className="eyebrow mb-3">Buy more, pay less</p>
          <table className="w-full text-sm">
            <tbody>
              <tr className={qty < p.priceTiers[0].min_qty ? "text-accent" : "text-muted"}><td className="py-1">1–{p.priceTiers[0].min_qty - 1}</td><td className="text-right">{pkr(variant ? variant.price : p.selling_price)} each</td></tr>
              {p.priceTiers.map((t, n) => {
                const next = p.priceTiers[n + 1];
                const active = qty >= t.min_qty && (!next || qty < next.min_qty);
                return <tr key={t.min_qty} className={active ? "text-accent" : "text-muted"}><td className="py-1">{t.min_qty}{next ? `–${next.min_qty - 1}` : "+"}</td><td className="text-right">{pkr(t.unit_price)} each</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-stretch gap-3">
        <div className="flex items-center border border-line" role="group" aria-label="Quantity">
          <button className="h-full px-4 text-lg transition hover:text-accent" onClick={() => setQty((q) => clamp(q - 1))} aria-label="Decrease quantity">−</button>
          <input value={qty} onChange={(e) => setQty(clamp(Number(e.target.value) || p.moq))} inputMode="numeric" aria-label="Quantity" className="w-12 bg-transparent text-center text-sm outline-none" />
          <button className="h-full px-4 text-lg transition hover:text-accent" onClick={() => setQty((q) => clamp(q + 1))} aria-label="Increase quantity">+</button>
        </div>
        <div className="flex-1">{cta}</div>
      </div>
      {p.moq > 1 && <p className="text-xs text-muted">Minimum order quantity: {p.moq}</p>}

      <ul className="grid gap-3 border-t border-line pt-6 text-sm text-muted sm:grid-cols-2">
        {([[CashIcon, "Cash on delivery available"], [TruckIcon, store.freeShippingThreshold > 0 ? `Free delivery over ${pkr(store.freeShippingThreshold)}` : "Free delivery"], [PackageIcon, "Checked and packed with care"], [SupportIcon, "Easy support if anything is off"]] as const).map(([Ic, t]) => (
          <li key={t} className="flex items-center gap-3"><Ic size={20} className="shrink-0 text-fg" />{t}</li>
        ))}
      </ul>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 p-3 backdrop-blur md:hidden">{cta}</div>
    </div>
  );
}
