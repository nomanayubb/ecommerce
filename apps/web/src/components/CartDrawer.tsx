"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./CartProvider";
import { pkr } from "@/lib/api";
import { useSite } from "./Site";
import { MascotFigure } from "./Mascot";

export function CartDrawer() {
  const { lines, open, setOpen, setQty, count } = useCart();
  const FREE_SHIPPING = useSite().store.freeShippingThreshold;
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING - subtotal);

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

            <div className="border-b border-line px-6 py-4 text-sm">
              <p className={remaining > 0 ? "text-muted" : "text-accent"}>
                {remaining > 0 ? <>Add <strong className="text-fg">{pkr(remaining)}</strong> more for free delivery</> : "You have unlocked free delivery"}
              </p>
              <div className="mt-3 h-1 bg-line"><div className="h-1 bg-accent transition-all duration-500" style={{ width: `${Math.min(100, (FREE_SHIPPING > 0 ? subtotal / FREE_SHIPPING : 1) * 100)}%` }} /></div>
            </div>

            <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
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
                      <button className="text-xs uppercase tracking-widest text-muted underline-offset-4 transition hover:text-accent hover:underline" onClick={() => setQty(l.productId, l.variantId, 0)}>Remove</button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{pkr(l.price * l.quantity)}</p>
                </li>
              ))}
            </ul>

            <div className="border-t border-line bg-card px-6 py-5">
              <div className="mb-1 flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="text-lg font-semibold">{pkr(subtotal)}</span></div>
              <p className="mb-4 text-xs text-muted">Delivery and final total are confirmed at checkout.</p>
              <Link href="/checkout" onClick={() => setOpen(false)} aria-disabled={!lines.length} className={`btn btn-primary w-full ${lines.length ? "" : "pointer-events-none opacity-40"}`}>Checkout</Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
