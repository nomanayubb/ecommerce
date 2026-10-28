import Link from "next/link";
import type { Metadata } from "next";
import { apiAuthed, getAccount } from "@/lib/session";
import { pkr } from "@/lib/api";
import { ProfileForm } from "@/components/AccountBits";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

interface OrderRow { order_number: number; order_status: string; grand_total: string; created_at: string; item_count: number }

export default async function Account() {
  const a = (await getAccount())!;
  const orders: OrderRow[] = await apiAuthed("/account/orders").then((r) => (r.ok ? r.json() : [])).catch(() => []);
  const { loyalty: l } = a;
  const top = l.tiers[l.tiers.length - 1];
  const span = l.nextTier ? (l.tiers.find((t) => t.name === l.nextTier)!.min - (l.tiers.find((t) => t.name === l.tier)?.min ?? 0)) : 1;
  const done = l.nextTier ? span - l.pointsToNext : span;

  return (
    <div className="space-y-12">
      <div>
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">{a.user.firstName || "Your account"}</h1>
      </div>

      <section aria-label="Loyalty" className="border border-line bg-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">Loyalty</p><p className="mt-2 text-4xl font-semibold">{l.points} <span className="text-base font-normal text-muted">points</span></p></div>
          <p className="border border-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-accent">{l.tier}</p>
        </div>
        <div className="mt-5 h-1.5 bg-line"><div className="h-1.5 bg-accent transition-all" style={{ width: `${Math.min(100, (done / span) * 100)}%` }} /></div>
        <p className="mt-3 text-sm text-muted">
          {l.nextTier ? <>{l.pointsToNext} more points to reach <strong className="text-fg">{l.nextTier}</strong>. </> : <>You have reached our top tier ({top.name}). </>}
          You earn 1 point for every {pkr(l.pointUnit)} on delivered orders.
        </p>
      </section>

      <section aria-label="Profile"><h2 className="eyebrow mb-4">Your details</h2><ProfileForm firstName={a.user.firstName ?? ""} lastName={a.user.lastName ?? ""} phone={a.user.phone ?? ""} /></section>

      <section aria-label="Recent orders">
        <div className="mb-4 flex items-end justify-between"><h2 className="eyebrow">Recent orders</h2><Link href="/account/orders" className="text-xs font-semibold uppercase tracking-[0.2em] hover:text-accent">All orders →</Link></div>
        {orders.length === 0 ? <p className="border border-dashed border-line p-8 text-center text-sm text-muted">No orders yet. <Link href="/products" className="text-accent hover:underline">Start shopping</Link></p> : (
          <ul className="divide-y divide-line border border-line">
            {orders.slice(0, 3).map((o) => (
              <li key={o.order_number}><Link href={`/account/orders/${o.order_number}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-card">
                <span className="font-medium">#{o.order_number}</span><span className="text-sm text-muted">{o.item_count} item{o.item_count === 1 ? "" : "s"} · {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                <span className="text-xs uppercase tracking-[0.18em] text-accent">{o.order_status}</span><span className="font-semibold">{pkr(o.grand_total)}</span>
              </Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
