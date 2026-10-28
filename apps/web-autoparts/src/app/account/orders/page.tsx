import Link from "next/link";
import type { Metadata } from "next";
import { apiAuthed } from "@/lib/session";
import { pkr } from "@/lib/api";

export const metadata: Metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

interface OrderRow { order_number: number; order_status: string; payment_status: string; payment_method: string; grand_total: string; created_at: string; item_count: number }

export default async function Orders() {
  const orders: OrderRow[] = await apiAuthed("/account/orders").then((r) => (r.ok ? r.json() : [])).catch(() => []);
  return (
    <>
      <div className="mb-8 border-b border-line pb-6"><p className="eyebrow">History</p><h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Orders</h1></div>
      {orders.length === 0 ? (
        <div className="border border-dashed border-line py-20 text-center"><p className="text-muted">You have not placed an order yet.</p><Link href="/products" className="btn btn-primary mt-6">Browse the collection</Link></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-muted"><tr>{["Order", "Date", "Items", "Status", "Total"].map((h) => <th key={h} className="px-3 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em]">{h}</th>)}</tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_number} className="border-t border-line transition hover:bg-card">
                  <td className="px-3 py-4"><Link href={`/account/orders/${o.order_number}`} className="font-medium text-accent hover:underline">#{o.order_number}</Link></td>
                  <td className="px-3 py-4 text-muted">{new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-3 py-4">{o.item_count}</td>
                  <td className="px-3 py-4 text-xs uppercase tracking-[0.18em]">{o.order_status}</td>
                  <td className="px-3 py-4 font-semibold">{pkr(o.grand_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
