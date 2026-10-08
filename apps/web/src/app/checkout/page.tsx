"use client";

import { useState } from "react";
import { api, pkr } from "@/lib/api";
import { useCart } from "@/components/CartProvider";

export default function Checkout() {
  const { lines, clear } = useCart();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderNumber: number; grandTotal: number } | null>(null);

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await api<{ orderNumber: number; grandTotal: number }>("/checkout/process", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
          shippingAddress: {
            name: f.get("name"), phone: f.get("phone"), line1: f.get("line1"), city: f.get("city"), country: "PK",
          },
          paymentMethod: "COD",
        }),
      });
      clear();
      setDone(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Order #{done.orderNumber} placed</h1>
        <p className="mt-2 text-muted">Pay {pkr(done.grandTotal)} in cash on delivery.</p>
      </div>
    );

  if (lines.length === 0) return <p className="text-muted">Your cart is empty.</p>;

  const input = "w-full rounded border border-line bg-card px-3 py-2";
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <input name="name" required placeholder="Full name" className={input} />
      <input name="phone" required placeholder="Phone" className={input} />
      <input name="line1" required placeholder="Address" className={input} />
      <input name="city" required placeholder="City" className={input} />
      <p className="text-sm text-muted">Payment: Cash on Delivery. Shipping is calculated by the server; items {pkr(subtotal)}.</p>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-brand py-3 font-medium text-onbrand disabled:opacity-50">
        {busy ? "Placing order…" : "Place order"}
      </button>
    </form>
  );
}
