"use client";

import { Fragment, useEffect, useState } from "react";
import { api, pkr, type AdminOrder } from "@/lib/api";

const STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"] as const;

interface Detail {
  customer_email: string | null; shipping_address: { name: string; phone: string; line1: string; city: string; postalCode?: string };
  items: { title: string; sku: string; unit_price: string; quantity: number; total_price: string }[];
  subtotal: string; discount_total: string; shipping_fee: string; gift_wrap_fee: string; grand_total: string;
  coupon_code: string | null; gift_wrap: boolean; gift_message: string | null; notes: string | null;
}

function OrderDetail({ id }: { id: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<Detail>(`/admin/orders/${id}`).then(setD).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <p className="text-red-500">{err}</p>;
  if (!d) return <p className="text-muted">Loading...</p>;
  const a = d.shipping_address;
  return (
    <div className="grid gap-6 text-sm md:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-muted">Ship to</p>
        <p>{a.name} · {a.phone}</p><p>{a.line1}, {a.city} {a.postalCode ?? ""}</p>
        {d.customer_email && <p className="text-muted">{d.customer_email}</p>}
        {d.notes && <p className="mt-3"><span className="text-xs font-semibold uppercase text-muted">Customer note</span><br />{d.notes}</p>}
        {d.gift_wrap && <p className="mt-3 rounded border border-line p-2"><span className="text-xs font-semibold uppercase text-muted">Gift wrap</span><br />{d.gift_message || "No message"}</p>}
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-muted">Items</p>
        <ul>{d.items.map((i) => <li key={i.sku + i.title} className="flex justify-between gap-3 border-b border-line py-1"><span>{i.quantity} × {i.title} <span className="text-muted">({i.sku})</span></span><span>{pkr(i.total_price)}</span></li>)}</ul>
        <p className="mt-2 flex justify-between text-muted"><span>Subtotal</span><span>{pkr(d.subtotal)}</span></p>
        {Number(d.discount_total) > 0 && <p className="flex justify-between text-muted"><span>Discount ({d.coupon_code})</span><span>-{pkr(d.discount_total)}</span></p>}
        {Number(d.gift_wrap_fee) > 0 && <p className="flex justify-between text-muted"><span>Gift wrap</span><span>{pkr(d.gift_wrap_fee)}</span></p>}
        <p className="flex justify-between text-muted"><span>Delivery</span><span>{Number(d.shipping_fee) ? pkr(d.shipping_fee) : "Free"}</span></p>
        <p className="flex justify-between font-semibold"><span>Total</span><span>{pkr(d.grand_total)}</span></p>
      </div>
    </div>
  );
}

export default function Orders() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");

  const load = (status = filter) =>
    api<AdminOrder[]>(`/admin/orders${status ? `?status=${status}` : ""}`).then(setRows).catch((e) => setMsg(e.message));
  useEffect(() => { load(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(id: string, status: string) {
    try {
      await api(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setRows((r) => r.map((o) => (o.id === id ? { ...o, order_status: status } : o)));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Update failed");
    }
  }

  const cell = "border-b border-line px-2 py-2";
  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Orders</h1>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); load(e.target.value); }}
          className="rounded border border-line bg-card px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {msg && <p className="mb-2 text-sm text-red-500">{msg}</p>}
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr><th className={cell}>#</th><th className={cell}>Date</th><th className={cell}>Total</th><th className={cell}>Payment</th><th className={cell}>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <Fragment key={o.id}>
            <tr>
              <td className={cell}><button className="underline" onClick={() => setOpenId(openId === o.id ? null : o.id)} aria-expanded={openId === o.id}>{o.order_number}</button></td>
              <td className={`${cell} text-muted`}>{new Date(o.created_at).toLocaleString()}</td>
              <td className={cell}>{pkr(o.grand_total)}</td>
              <td className={cell}>{o.payment_method} · {o.payment_status}</td>
              <td className={cell}>
                <select value={o.order_status} onChange={(e) => setStatus(o.id, e.target.value)} className="rounded border border-line bg-card px-2 py-1">
                  {o.order_status === "PENDING" && <option>PENDING</option>}
                  {STATUSES.filter((s) => s !== "PENDING").map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
            {openId === o.id && <tr><td colSpan={5} className="border-b border-line bg-card/50 px-4 py-4"><OrderDetail id={o.id} /></td></tr>}
            </Fragment>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mt-4 text-muted">No orders.</p>}
    </>
  );
}
