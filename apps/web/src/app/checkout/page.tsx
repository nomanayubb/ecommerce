"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pkr } from "@/lib/api";
import { send } from "@/lib/client";
import { useSession } from "@/components/SessionProvider";
import { useCart } from "@/components/CartProvider";
import { MascotFigure } from "@/components/Mascot";
import { GiftOptions, PromoField, useCartPricing } from "@/components/CartExtras";
import { fireConfetti, mascotSay } from "@/lib/motion";

export default function Checkout() {
  const { lines, clear, extras } = useCart();
  const { priced, error: priceError } = useCartPricing();
  const { user, ready } = useSession();
  const [saved, setSaved] = useState<{ id: string; label: string | null; name: string; phone: string; line1: string; city: string; postal_code: string | null; is_default: boolean }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderNumber: number; grandTotal: number } | null>(null);

  const payload = lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }));

  type Addr = (typeof saved)[number];
  const fillAddr = (a: Addr) => {
    const form = document.getElementById("checkout-form") as HTMLFormElement | null;
    if (!form) return;
    const set = (n: string, v: string) => { const el = form.elements.namedItem(n) as HTMLInputElement | null; if (el) el.value = v; };
    set("name", a.name); set("phone", a.phone); set("line1", a.line1); set("city", a.city); set("postalCode", a.postal_code ?? "");
  };
  useEffect(() => {
    if (!user) return;
    send<Addr[]>("GET", "account/addresses").then((list) => { setSaved(list); const d = list.find((x) => x.is_default); if (d) setTimeout(() => fillAddr(d), 0); }).catch(() => {});
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await send<{ orderNumber: number; grandTotal: number }>("POST", "checkout/process", {
        items: payload,
        shippingAddress: { name: f.get("name"), phone: f.get("phone"), line1: f.get("line1"), city: f.get("city"), postalCode: f.get("postalCode") || undefined, country: "PK" },
        notes: extras.note || undefined,
        couponCode: extras.coupon || undefined,
        giftWrap: extras.giftWrap || undefined,
        giftMessage: extras.giftWrap ? extras.giftMessage || undefined : undefined,
        paymentMethod: "COD",
      });
      clear();
      setDone(res);
      fireConfetti();
      mascotSay("celebrate", "Order placed. Thank you!");
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
        <MascotFigure mood="celebrate" size={120} className="mx-auto mb-4 text-fg" />
        <p className="eyebrow">Order confirmed</p>
        <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[0.1em]">Thank you</h1>
        <p className="mt-4 text-muted">Your order <strong className="text-fg">#{done.orderNumber}</strong> has been placed. Please keep <strong className="text-fg">{pkr(done.grandTotal)}</strong> ready to pay in cash on delivery.</p>
        <Link href="/products" className="btn btn-primary mt-10">Continue shopping</Link>
      </div>
    );

  if (lines.length === 0)
    return (
      <div className="py-24 text-center">
        <MascotFigure mood="sad" size={96} className="mx-auto mb-4 text-fg" />
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
            {ready && !user && <p className="mb-5 border border-line bg-card px-4 py-3 text-sm text-muted"><a href="/login?next=/checkout" className="text-accent hover:underline">Sign in</a> for faster checkout and order history, or continue as a guest.</p>}
            {saved.length > 0 && (
              <label className="mb-5 block"><span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">Use a saved address</span>
                <select onChange={(e) => { const a = saved.find((x) => x.id === e.target.value); if (a) fillAddr(a); }} defaultValue={saved.find((x) => x.is_default)?.id} className="w-full border border-line bg-card px-4 py-3 text-sm">
                  {saved.map((x) => <option key={x.id} value={x.id}>{x.label || x.line1} · {x.city}</option>)}
                </select>
              </label>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={label}>Full name</span><input name="name" required autoComplete="name" className={field} /></label>
              <label><span className={label}>Phone</span><input name="phone" required type="tel" autoComplete="tel" placeholder="03XX XXXXXXX" minLength={7} className={field} /></label>
              <label className="sm:col-span-2"><span className={label}>Address</span><input name="line1" required autoComplete="street-address" className={field} /></label>
              <label><span className={label}>City</span><input name="city" required autoComplete="address-level2" className={field} /></label>
              <label><span className={label}>Postal code (optional)</span><input name="postalCode" autoComplete="postal-code" className={field} /></label>
            </div>
            <div className="mt-4"><GiftOptions /></div>
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

          {(error || priceError) && <p role="alert" className="border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error || priceError}</p>}
          <button disabled={busy || !priced} className="btn btn-primary w-full disabled:opacity-50 lg:hidden">{busy ? "Placing order…" : `Place order · ${priced ? pkr(priced.grandTotal) : ""}`}</button>
        </form>

        <aside className="h-fit border border-line bg-card p-6 lg:sticky lg:top-24">
          <details open className="group [&::-webkit-details-marker]:hidden lg:[&>summary]:pointer-events-none" id="order-summary">
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <h2 className="eyebrow">Order summary ({lines.reduce((n, l) => n + l.quantity, 0)})</h2>
              <span className="text-sm font-semibold lg:hidden">{priced ? pkr(priced.grandTotal) : ""}<span className="ml-2 text-muted transition group-open:rotate-180 inline-block">⌄</span></span>
            </summary>
            <ul className="mt-5 divide-y divide-line">
              {lines.map((l) => (
                <li key={`${l.productId}:${l.variantId}`} className="flex gap-4 py-4 text-sm">
                  {l.image && <img src={l.image} alt="" width={56} height={70} className="h-[70px] w-14 border border-line object-cover" />}
                  <div className="flex-1"><p className="leading-snug">{l.title}</p><p className="mt-1 text-xs text-muted">Qty {l.quantity}</p></div>
                  <p>{pkr(l.price * l.quantity)}</p>
                </li>
              ))}
            </ul>
          </details>
          <div className="mt-4 border-t border-line pt-4"><PromoField priced={priced} /></div>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{priced ? pkr(priced.subtotal) : "…"}</dd></div>
            {priced && priced.discount > 0 && <div className="flex justify-between text-accent"><dt>Discount ({priced.coupon?.code})</dt><dd>−{pkr(priced.discount)}</dd></div>}
            {priced && priced.giftWrapFee > 0 && <div className="flex justify-between"><dt className="text-muted">Gift wrap</dt><dd>{pkr(priced.giftWrapFee)}</dd></div>}
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
