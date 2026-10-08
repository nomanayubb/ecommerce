"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, pkr } from "@/lib/api";
import { useCart } from "@/components/CartProvider";

interface Priced { subtotal: number; shippingFee: number; grandTotal: number; freeShippingRemaining: number }

export default function Checkout() {
  const { lines, clear } = useCart();
  const [priced, setPriced] = useState<Priced | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderNumber: number; grandTotal: number } | null>(null);

  const payload = lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }));
  const key = JSON.stringify(payload);

  // Server is the source of truth for totals (prices, tiers, shipping).
  useEffect(() => {
    if (!lines.length) return setPriced(null);
    api<Priced>("/cart/validate", { method: "POST", body: JSON.stringify({ items: JSON.parse(key) }) })
      .then((r) => { setPriced(r); setError(""); })
      .catch((e) => setError(e.message));
  }, [key, lines.length]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await api<{ orderNumber: number; grandTotal: number }>("/checkout/process", {
        method: "POST",
        body: JSON.stringify({
          items: payload,
          shippingAddress: { name: f.get("name"), phone: f.get("phone"), line1: f.get("line1"), city: f.get("city"), postalCode: f.get("postalCode") || undefined, country: "PK" },
          notes: f.get("notes") || undefined,
          paymentMethod: "COD",
        }),
      });
      clear();
      setDone(res);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-accent text-2xl text-accent">✓</div>
        <p className="eyebrow">Order confirmed</p>
        <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[0.1em]">Thank you</h1>
        <p className="mt-4 text-muted">Your order <strong className="text-fg">#{done.orderNumber}</strong> has been placed. Please keep <strong className="text-fg">{pkr(done.grandTotal)}</strong> ready to pay in cash on delivery.</p>
        <Link href="/products" className="btn btn-primary mt-10">Continue shopping</Link>
      </div>
    );

  if (lines.length === 0)
    return (
      <div className="py-24 text-center">
        <p className="eyebrow">Checkout</p>
        <p className="mt-3 text-muted">Your bag is empty.</p>
        <Link href="/products" className="btn btn-primary mt-8">Browse the collection</Link>
      </div>
    );

  const field = "w-full border border-line bg-card px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent";
  const label = "mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted";

  return (
    <>
      <h1 className="mb-10 text-3xl font-semibold uppercase tracking-[0.1em]">Checkout</h1>
      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="space-y-10" id="checkout-form">
          <section>
            <h2 className="eyebrow mb-5">1 · Delivery details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={label}>Full name</span><input name="name" required autoComplete="name" className={field} /></label>
              <label><span className={label}>Phone</span><input name="phone" required type="tel" autoComplete="tel" placeholder="03XX XXXXXXX" minLength={7} className={field} /></label>
              <label className="sm:col-span-2"><span className={label}>Address</span><input name="line1" required autoComplete="street-address" className={field} /></label>
              <label><span className={label}>City</span><input name="city" required autoComplete="address-level2" className={field} /></label>
              <label><span className={label}>Postal code (optional)</span><input name="postalCode" autoComplete="postal-code" className={field} /></label>
              <label className="sm:col-span-2"><span className={label}>Order notes (optional)</span><textarea name="notes" rows={2} className={field} /></label>
            </div>
          </section>

          <section>
            <h2 className="eyebrow mb-5">2 · Payment</h2>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-4 border border-accent bg-accent/5 p-4">
                <input type="radio" name="pay" defaultChecked readOnly className="mt-1 accent-[rgb(var(--accent))]" />
                <span><span className="block text-sm font-semibold">Cash on delivery</span><span className="text-sm text-muted">Pay the courier when your order arrives.</span></span>
              </label>
              {["EasyPaisa", "JazzCash", "Card"].map((m) => (
                <div key={m} className="flex items-center justify-between border border-line p-4 text-sm text-muted opacity-60">
                  <span>{m}</span><span className="text-[0.65rem] uppercase tracking-widest">Coming soon</span>
                </div>
              ))}
            </div>
          </section>

          {error && <p role="alert" className="border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
          <button disabled={busy || !priced} className="btn btn-primary w-full disabled:opacity-50 lg:hidden">{busy ? "Placing order…" : `Place order · ${priced ? pkr(priced.grandTotal) : ""}`}</button>
        </form>

        <aside className="h-fit border border-line bg-card p-6 lg:sticky lg:top-24">
          <h2 className="eyebrow mb-5">Order summary</h2>
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <li key={`${l.productId}:${l.variantId}`} className="flex gap-4 py-4 text-sm">
                {l.image && <img src={l.image} alt="" width={56} height={70} className="h-[70px] w-14 border border-line object-cover" />}
                <div className="flex-1"><p className="leading-snug">{l.title}</p><p className="mt-1 text-xs text-muted">Qty {l.quantity}</p></div>
                <p>{pkr(l.price * l.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{priced ? pkr(priced.subtotal) : "…"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{priced ? (priced.shippingFee === 0 ? "Free" : pkr(priced.shippingFee)) : "…"}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{priced ? pkr(priced.grandTotal) : "…"}</dd></div>
          </dl>
          {priced && priced.freeShippingRemaining > 0 && <p className="mt-3 text-xs text-accent">Add {pkr(priced.freeShippingRemaining)} more for free delivery.</p>}
          <button form="checkout-form" disabled={busy || !priced} className="btn btn-primary mt-6 hidden w-full disabled:opacity-50 lg:inline-flex">{busy ? "Placing order…" : "Place order"}</button>
          <p className="mt-4 text-center text-xs text-muted">By placing your order you agree to pay on delivery.</p>
        </aside>
      </div>
    </>
  );
}
