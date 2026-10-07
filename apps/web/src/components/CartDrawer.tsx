"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./CartProvider";
import { pkr } from "@/lib/api";

const FREE_SHIPPING = 5000;

export function CartDrawer() {
  const { lines, open, setOpen, setQty } = useCart();
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING - subtotal);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-bg shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            aria-label="Shopping cart"
          >
            <div className="flex items-center justify-between border-b border-line p-4">
              <h2 className="font-semibold">Your cart</h2>
              <button onClick={() => setOpen(false)} aria-label="Close cart">✕</button>
            </div>

            <div className="border-b border-line p-4 text-sm">
              {remaining > 0 ? `Add ${pkr(remaining)} more for free shipping` : "You've unlocked free shipping 🎉"}
              <div className="mt-2 h-2 rounded bg-card">
                <div className="h-2 rounded bg-brand transition-all" style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING) * 100)}%` }} />
              </div>
            </div>

            <ul className="flex-1 space-y-4 overflow-y-auto p-4">
              {lines.length === 0 && <li className="text-muted">Your cart is empty.</li>}
              {lines.map((l) => (
                <li key={`${l.productId}:${l.variantId}`} className="flex gap-3">
                  {l.image && <img src={l.image} alt="" className="h-16 w-16 rounded object-cover" />}
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{l.title}</p>
                    <p className="text-muted">{pkr(l.price)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button className="rounded border border-line px-2" onClick={() => setQty(l.productId, l.variantId, l.quantity - 1)}>−</button>
                      <span>{l.quantity}</span>
                      <button className="rounded border border-line px-2" onClick={() => setQty(l.productId, l.variantId, l.quantity + 1)}>+</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-line p-4">
              <div className="mb-3 flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>{pkr(subtotal)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className={`block rounded bg-brand py-3 text-center font-medium text-white ${lines.length ? "" : "pointer-events-none opacity-50"}`}
              >
                Checkout
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
