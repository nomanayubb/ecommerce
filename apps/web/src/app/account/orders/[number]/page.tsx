import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiAuthed } from "@/lib/session";
import { pkr } from "@/lib/api";
import { Timeline, type TimelineData } from "@/components/Timeline";
import { ReorderButton } from "@/components/AccountBits";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  return { title: `Order #${(await params).number}` };
}

interface Detail {
  order: { order_number: number; order_status: string; payment_status: string; payment_method: string; subtotal: string; shipping_fee: string; grand_total: string; created_at: string; shipping_address: { name: string; phone: string; line1: string; city: string } };
  items: { product_id: string | null; variant_id: string | null; title: string; sku: string; unit_price: string; quantity: number; total_price: string }[];
  timeline: TimelineData;
}

export default async function OrderDetail({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const r = await apiAuthed(`/account/orders/${encodeURIComponent(number)}`).catch(() => null);
  if (!r || !r.ok) notFound();
  const d: Detail = await r.json();
  const { order: o } = d;
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div><Link href="/account/orders" className="text-xs uppercase tracking-[0.2em] text-muted hover:text-accent">← All orders</Link><h1 className="mt-3 text-3xl font-semibold uppercase tracking-[0.1em]">Order #{o.order_number}</h1>
          <p className="mt-1 text-sm text-muted">Placed {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {o.payment_method} · payment {o.payment_status.toLowerCase()}</p></div>
        <ReorderButton items={d.items} />
      </div>
      <Timeline timeline={d.timeline} />
      <div className="grid gap-10 md:grid-cols-[1fr_280px]">
        <ul className="divide-y divide-line border border-line">
          {d.items.map((i) => (
            <li key={i.sku} className="flex items-center justify-between gap-4 px-5 py-4 text-sm"><div><p className="font-medium">{i.title}</p><p className="text-xs text-muted">Qty {i.quantity} · {pkr(i.unit_price)} each</p></div><p className="font-semibold">{pkr(i.total_price)}</p></li>
          ))}
        </ul>
        <div className="space-y-6 text-sm">
          <div className="border border-line bg-card p-5">
            <dl className="space-y-2"><div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{pkr(o.subtotal)}</dd></div><div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{Number(o.shipping_fee) === 0 ? "Free" : pkr(o.shipping_fee)}</dd></div><div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{pkr(o.grand_total)}</dd></div></dl>
          </div>
          <div><p className="eyebrow mb-2">Delivering to</p><p className="text-muted">{o.shipping_address.name}<br />{o.shipping_address.line1}<br />{o.shipping_address.city}<br />{o.shipping_address.phone}</p></div>
        </div>
      </div>
    </div>
  );
}
