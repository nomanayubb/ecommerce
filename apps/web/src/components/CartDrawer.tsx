"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./CartProvider";
import { pkr } from "@/lib/api";
import { useSite } from "./Site";
import { MascotFigure } from "./Mascot";
import { GiftOptions, PromoField, Upsells, useCartPricing } from "./CartExtras";

export function CartDrawer() {
  const { lines, saved, open, setOpen, setQty, count, saveForLater, moveToBag, removeSaved } = useCart();
  const { priced } = useCartPricing();
  const FREE_SHIPPING = useSite().store.freeShippingThreshold;
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const net = priced ? priced.subtotal - priced.discount : subtotal;
  const remaining = Math.max(0, FREE_SHIPPING - net);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside
            role="dialog" aria-modal="true" aria-label="Shopping bag"
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-bg shadow-2xl"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em]">Your bag <span className="text-accent">({count})</span></h2>
              <button onClick={() => setOpen(false)} aria-label="Close bag" className="text-xl leading-none transition hover:text-accent">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto">
            <div className="border-b border-line px-6 py-4 text-sm">
              <p className={remaining > 0 ? "text-muted" : "text-accent"}>
                {remaining > 0 ? <>Add <strong className="text-fg">{pkr(remaining)}</strong> more for free delivery</> : "You have unlocked free delivery"}
              </p>
              <div className="mt-3 h-1 bg-line"><div className="h-1 bg-accent transition-all duration-500" style={{ width: `${Math.min(100, (FREE_SHIPPING > 0 ? net / FREE_SHIPPING : 1) * 100)}%` }} /></div>
            </div>

            <ul className="divide-y divide-line px-6">
              {lines.length === 0 && (
                <li className="py-20 text-center">
                  <MascotFigure mood="sad" size={96} className="mx-auto mb-4 text-fg" />
                  <p className="eyebrow">Your bag is empty</p>
                  <Link href="/products" onClick={() => setOpen(false)} className="btn btn-primary mt-6">Start shopping</Link>
                </li>
              )}
              {lines.map((l) => (
                <li key={`${l.productId}:${l.variantId}`} className="flex gap-4 py-5">
                  {l.image && <img src={l.image} alt="" width={80} height={100} className="h-24 w-20 shrink-0 border border-line object-cover" />}
                  <div className="flex flex-1 flex-col text-sm">
                    <p className="font-medium leading-snug">{l.title}</p>
                    <p className="mt-1 text-muted">{pkr(l.price)}</p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center border border-line">
                        <button className="px-3 py-1 transition hover:text-accent" onClick={() => setQty(l.productId, l.variantId, l.quantity - 1)} aria-label="Decrease quantity">−</button>
                        <span className="w-8 text-center text-xs">{l.quantity}</span>
                        <button className="px-3 py-1 transition hover:text-accent" onClick={() => setQty(l.productId, l.variantId, l.quantity + 1)} aria-label="Increase quantity">+</button>
                      </div>
                      <span className="flex gap-3">
                        <button className="text-xs uppercase tracking-widest text-muted underline-offset-4 transition hover:text-accent hover:underline" onClick={() => saveForLater(l.productId, l.variantId)}>Save</button>
                        <button className="text-xs uppercase tracking-widest text-muted underline-offset-4 transition hover:text-accent hover:underline" onClick={() => setQty(l.productId, l.variantId, 0)}>Remove</button>
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{pkr(l.price * l.quantity)}</p>
                </li>
              ))}
            </ul>
            {(lines.length > 0 || saved.length > 0) && (
              <div className="border-t border-line px-6">
                {saved.length > 0 && (
                  <section aria-label="Saved for later" className="py-4">
                    <p className="eyebrow mb-3 !text-[0.65rem]">Saved for later ({saved.length})</p>
                    <ul className="space-y-3">
                      {saved.map((l) => (
                        <li key={`${l.productId}:${l.variantId}`} className="flex items-center gap-3 text-sm">
                          {l.image && <img src={l.image} alt="" width={40} height={50} className="h-12 w-10 border border-line object-cover" />}
                          <span className="min-w-0 flex-1"><span className="line-clamp-1">{l.title}</span><span className="text-xs text-muted">{pkr(l.price)}</span></span>
                          <button className="text-xs uppercase tracking-widest text-accent hover:underline" onClick={() => moveToBag(l.productId, l.variantId)}>Move to bag</button>
                          <button aria-label="Remove saved item" className="text-muted hover:text-accent" onClick={() => removeSaved(l.productId, l.variantId)}>✕</button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {lines.length > 0 && <Upsells />}
              </div>
            )}

            {lines.length > 0 && (
              <div className="space-y-3 border-t border-line px-6 py-4">
                <PromoField priced={priced} />
                <GiftOptions />
              </div>
            )}
            </div>

            <div className="border-t border-line bg-card px-6 py-5">
              {priced && priced.discount > 0 && (
                <div className="mb-1 flex justify-between text-sm text-accent"><span>Discount ({priced.coupon?.code})</span><span>−{pkr(priced.discount)}</span></div>
              )}
              <div className="mb-1 flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="text-lg font-semibold">{pkr(priced ? priced.subtotal - priced.discount : subtotal)}</span></div>
              <p className="mb-4 text-xs text-muted">{priced?.giftWrapFee ? `Includes gift wrap ${pkr(priced.giftWrapFee)} at checkout. ` : ""}Delivery and final total are confirmed at checkout.</p>
              <Link href="/checkout" onClick={() => setOpen(false)} aria-disabled={!lines.length} className={`btn btn-primary w-full ${lines.length ? "" : "pointer-events-none opacity-40"}`}>Checkout</Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
