"use client";

import { useState } from "react";
import { pkr } from "@/lib/api";
import { Timeline, type TimelineData } from "@/components/Timeline";
import { MascotFigure } from "@/components/Mascot";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Result {
  order: { order_number: number; order_status: string; payment_status: string; payment_method: string; grand_total: string; created_at: string; city?: string };
  items: { title: string; unit_price: string; quantity: number }[];
  timeline: TimelineData;
}

export default function Track() {
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const field = "w-full border border-line bg-card px-4 py-3 text-sm outline-none transition focus:border-accent";
  const label = "mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(""); setRes(null);
    try {
      const q = new URLSearchParams({ number: String(f.get("number")).replace(/\D/g, ""), phone: String(f.get("phone")) });
      const r = await fetch(`${BASE}/orders/track?${q}`, { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Could not find that order");
      setRes(d);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <MascotFigure mood={res ? "happy" : "carry"} size={84} className="mx-auto mb-3 text-fg" />
        <p className="eyebrow">Where is my order?</p>
        <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Track your order</h1>
        <p className="mt-3 text-sm text-muted">Enter your order number and the phone number you used at checkout.</p>
      </div>
      <form onSubmit={submit} className="grid gap-4 border border-line bg-card p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label><span className={label}>Order number</span><input name="number" required inputMode="numeric" placeholder="e.g. 12" className={field} /></label>
        <label><span className={label}>Phone</span><input name="phone" required type="tel" placeholder="03XX XXXXXXX" className={field} /></label>
        <button disabled={busy} className="btn btn-primary disabled:opacity-50">{busy ? "Checking…" : "Track"}</button>
      </form>
      {error && <p role="alert" className="mt-4 border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
      {res && (
        <section className="mt-8 space-y-8 border border-line p-6" aria-label="Order status">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Order #{res.order.order_number}</p><p className="mt-1 text-sm text-muted">Placed {new Date(res.order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}{res.order.city ? ` · delivering to ${res.order.city}` : ""}</p></div><p className="text-xl font-semibold">{pkr(res.order.grand_total)}</p></div>
          <Timeline timeline={res.timeline} />
          <ul className="divide-y divide-line border-t border-line text-sm">{res.items.map((i, n) => <li key={n} className="flex justify-between py-3"><span>{i.title} <span className="text-muted">× {i.quantity}</span></span><span>{pkr(Number(i.unit_price) * i.quantity)}</span></li>)}</ul>
          <p className="text-xs text-muted">Payment: {res.order.payment_method}, {res.order.payment_status.toLowerCase()}.</p>
        </section>
      )}
    </div>
  );
}
