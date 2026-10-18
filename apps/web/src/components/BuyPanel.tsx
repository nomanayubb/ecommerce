"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_PDP, pkr, type ProductDetail } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useSite } from "./Site";
import { DeliveryEstimate } from "./DeliveryEstimate";
import { StockAlert } from "./NewsletterForm";
import { TagIcons } from "./TagIcons";
import { SizeGuideButton, type Meta } from "./PdpExtras";
import { lastSize, rememberSize } from "@/lib/sizes";
import { DispatchNote } from "./Dispatch";
import { CashIcon, PackageIcon, SupportIcon, TruckIcon } from "./icons";

export function BuyPanel({ p, compact = false, onAdded }: { p: ProductDetail; compact?: boolean; onAdded?: () => void }) {
  const { add, lines, setOpen, setBuyNow } = useCart();
  const router = useRouter();
  const flags = (p.metafields ?? {}) as Record<string, unknown>;
  
  const ctaRef = useRef<HTMLDivElement>(null);
  const [pastCta, setPastCta] = useState(false);
  const { store } = useSite();
  const pdp = { ...DEFAULT_PDP, ...(store.pdp ?? {}) };
  const pick3 = (v: unknown, dflt: boolean) => (typeof v === "boolean" ? v : dflt);
  // Product page (not the quick view window): Buy now is the main button with a small Add to bag above it. Cards and the quick view keep their own Add to Cart.
  const showAdd = compact ? pick3(flags.showAddToCart, pdp.showAddToCart) : true, showBuy = compact ? pick3(flags.showBuyNow, pdp.showBuyNow) : true, showAddr = pick3(flags.showAddress, pdp.showAddress);
  const [variantId, setVariantId] = useState<string | null>(p.variants.find((v) => v.stock_quantity > 0)?.id ?? p.variants[0]?.id ?? null);
  const [qty, setQty] = useState(Math.max(1, p.moq));
  const [added, setAdded] = useState(false);

  const variant = p.variants.find((v) => v.id === variantId);

  // Variants that share attributes (colour, size, ...) are shown as one picker per attribute instead of one long list.
  const attrKeys = useMemo(() => {
    const skip = new Set(["colorHex"]);
    const keys = [...new Set(p.variants.flatMap((v) => Object.keys(v.variant_attributes ?? {})))].filter((k) => !skip.has(k));
    const order = (k: string) => (/colou?r/i.test(k) ? 0 : /size/i.test(k) ? 1 : 2);
    keys.sort((a, c) => order(a) - order(c));
    return p.variants.length > 1 && keys.length > 0 && p.variants.every((v) => keys.every((k) => v.variant_attributes?.[k])) ? keys : [];
  }, [p.variants]);
  const guide = (p.metafields as Meta | undefined)?.sizeGuide ?? null;
  const pick = (key: string, value: string) => {
    const want = { ...(variant?.variant_attributes ?? {}), [key]: value };
    // Prefer an in-stock variant matching every chosen value; otherwise relax the other choices.
    const exact = p.variants.find((v) => attrKeys.every((k) => v.variant_attributes[k] === want[k]) && v.stock_quantity > 0)
      ?? p.variants.find((v) => v.variant_attributes[key] === value && v.stock_quantity > 0)
      ?? p.variants.find((v) => v.variant_attributes[key] === value);
    if (exact) setVariantId(exact.id);
    if (/size/i.test(key)) rememberSize(value);
  };
  // Open on the size this shopper picked last time, when it is in stock.
  useEffect(() => {
    const sk = attrKeys.find((k) => /size/i.test(k)); const ls = lastSize();
    if (!sk || !ls) return;
    const cur = p.variants.find((v) => v.id === variantId);
    const m = p.variants.find((v) => v.variant_attributes[sk] === ls && v.stock_quantity > 0 && attrKeys.every((o) => o === sk || v.variant_attributes[o] === cur?.variant_attributes[o]));
    if (m && m.id !== variantId) setVariantId(m.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Show the photo that belongs to the chosen variant (colour swatch).
  useEffect(() => {
    if (variant?.image_index != null) window.dispatchEvent(new CustomEvent("pdp-image", { detail: variant.image_index }));
  }, [variant?.image_index, variantId]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Desktop: once the main button scrolls above the screen, a slim bar keeps it within reach.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || compact) return;
    const io = new IntersectionObserver(([e]) => setPastCta(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [compact]);
  const bagTotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const toFree = store.freeShippingThreshold > 0 ? Math.max(0, store.freeShippingThreshold - bagTotal - unit * qty) : 0;

  const addToBag = () => {
    add({ productId: p.id, variantId, title: variant ? `${p.title} - ${variant.title}` : p.title, price: unit, marked: Number(p.marked_price), image: p.images[0], quantity: qty });
    setAdded(true);
    onAdded?.();
    setTimeout(() => setAdded(false), 1800);
  };

  // Buy now orders only this product: it is not put in the bag, checkout gets it on its own (?buynow=1).
  const buyNow = () => {
    setBuyNow({ productId: p.id, variantId, title: variant ? `${p.title} - ${variant.title}` : p.title, price: unit, marked: Number(p.marked_price), image: p.images[0], quantity: qty });
    setOpen(false);
    router.push("/checkout?buynow=1");
  };
  const canBuy = showAdd || showBuy;
  const cta = canBuy ? (
    <div className="flex flex-col gap-2">
      {showAdd && (
        <button disabled={soldOut || qty > stock} onClick={addToBag} className={compact ? "btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40" : "btn w-full border border-accent/60 text-accent hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 !px-3 !py-1.5 !text-[0.66rem]"}>
          {soldOut ? "Sold out" : added ? "Added ✓" : compact ? `Add to bag · ${pkr(unit * qty)}` : "Add to bag"}
        </button>
      )}
      {showBuy && !soldOut && (
        <button disabled={qty > stock} onClick={buyNow} className={`btn w-full disabled:cursor-not-allowed disabled:opacity-40 ${showAdd && compact ? "border border-fg/50 hover:border-accent hover:text-accent" : "btn-primary"}`}>
          Buy now · {pkr(unit * qty)}
        </button>
      )}
    </div>
  ) : null;

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

      {attrKeys.length > 0 ? (
        <div className="space-y-5">
          {attrKeys.map((k) => {
            const values = [...new Set(p.variants.map((v) => v.variant_attributes[k]))];
            const isColor = /colou?r/i.test(k);
            const isSize = /size/i.test(k);
            return (
              <fieldset key={k}>
                <legend className="mb-3 flex w-full items-center justify-between">
                  <span className="eyebrow">{k.replace(/^\w/, (c) => c.toUpperCase())}<span className="ml-2 normal-case tracking-normal text-fg">{variant?.variant_attributes[k]}</span></span>
                  {isSize && guide && <SizeGuideButton guide={guide} title={p.title} />}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {values.map((val) => {
                    const sample = p.variants.find((v) => v.variant_attributes[k] === val)!;
                    const available = p.variants.some((v) => v.variant_attributes[k] === val && v.stock_quantity > 0 && attrKeys.every((o) => o === k || v.variant_attributes[o] === variant?.variant_attributes[o]));
                    const anyStock = p.variants.some((v) => v.variant_attributes[k] === val && v.stock_quantity > 0);
                    const on = variant?.variant_attributes[k] === val;
                    if (isColor) {
                      const css = sample.variant_attributes.colorHex || (typeof CSS !== "undefined" && CSS.supports("color", val) ? val : "");
                      return (
                        <button key={val} type="button" onClick={() => pick(k, val)} disabled={!anyStock} aria-pressed={on} aria-label={`${val}${anyStock ? "" : ", sold out"}`} title={val}
                          className={`relative h-9 w-9 rounded-full border-2 p-0.5 transition disabled:cursor-not-allowed disabled:opacity-35 ${on ? "border-accent" : "border-line hover:border-fg/60"} ${available || on ? "" : "opacity-60"}`}>
                          <span className="block h-full w-full rounded-full border border-line/60" style={css ? { background: css } : undefined}>{!css && <span className="grid h-full place-items-center text-[0.5rem]">{val.slice(0, 2)}</span>}</span>
                          {!anyStock && <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center text-lg text-fg/70">/</span>}
                        </button>
                      );
                    }
                    return (
                      <button key={val} type="button" onClick={() => pick(k, val)} disabled={!anyStock} aria-pressed={on}
                        className={`min-w-12 border px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through ${on ? "border-accent bg-accent/10 text-accent" : available ? "border-line hover:border-fg/60" : "border-line text-muted hover:border-fg/40"}`}>
                        {val}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      ) : p.variants.length > 0 && (
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

      {canBuy && <div className="flex items-end gap-3">
        <div className="flex h-[2.725rem] items-center border border-line" role="group" aria-label="Quantity">
          <button className="h-full px-4 text-lg transition hover:text-accent" onClick={() => setQty((q) => clamp(q - 1))} aria-label="Decrease quantity">−</button>
          <input value={qty} onChange={(e) => setQty(clamp(Number(e.target.value) || p.moq))} inputMode="numeric" onFocus={(e) => e.currentTarget.select()} aria-label="Quantity" className="w-12 bg-transparent text-center text-sm outline-none" />
          <button className="h-full px-4 text-lg transition hover:text-accent" onClick={() => setQty((q) => clamp(q + 1))} aria-label="Increase quantity">+</button>
        </div>
        <div ref={ctaRef} className="flex-1">{cta}</div>
      </div>}
      {!soldOut && store.freeShippingThreshold > 0 && (
        <p className="text-xs text-muted">{toFree > 0 ? <>Add <strong className="text-fg">{pkr(toFree)}</strong> more to your order for free delivery.</> : <span className="text-accent">This order qualifies for free delivery.</span>}</p>
      )}
      {soldOut && <StockAlert slug={p.slug} />}
      {p.moq > 1 && <p className="text-xs text-muted">Minimum order quantity: {p.moq}</p>}

      {!compact && pdp.showTrustIcons && <TagIcons tags={p.tags} size={22} max={8} labels className="border-t border-line pt-6" />}
      {!compact && pdp.showDispatch && !soldOut && <DispatchNote />}
      {!compact && showAddr && <DeliveryEstimate />}
      {!compact && pdp.showBenefits && (<ul className="grid gap-3 border-t border-line pt-6 text-sm text-muted sm:grid-cols-2">
        {([[CashIcon, "Cash on delivery available"], [TruckIcon, store.freeShippingThreshold > 0 ? `Free delivery over ${pkr(store.freeShippingThreshold)}` : "Free delivery"], [PackageIcon, "Checked and packed with care"], [SupportIcon, "Easy support if anything is off"]] as const).map(([Ic, t]) => (
          <li key={t} className="flex items-center gap-3"><Ic size={20} className="shrink-0 text-fg" />{t}</li>
        ))}
      </ul>)}

      {!compact && canBuy && pastCta && (
        <div className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-line bg-bg/95 backdrop-blur md:block">
          <div className="mx-auto flex max-w-[var(--maxw)] items-center gap-6 px-4 py-3">
            <p className="flex-1 truncate text-sm font-medium">{p.title}</p>
            <p className="text-sm font-semibold">{pkr(unit)}</p>
            <div className="w-64">{cta}</div>
          </div>
        </div>
      )}
      {/* Mobile sticky bar */}
      {!compact && canBuy && <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-bg/95 p-3 backdrop-blur md:hidden"><p className="min-w-0 flex-1 truncate text-xs font-medium">{p.title}</p><div className="w-48 shrink-0">{cta}</div></div>}
    </div>
  );
}
