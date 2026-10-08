"use client";

import { useEffect, useState } from "react";
import { api, pkr, type AdminOrder } from "@/lib/api";

const STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"] as const;

export default function Orders() {
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
            <tr key={o.id}>
              <td className={cell}>{o.order_number}</td>
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
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mt-4 text-muted">No orders.</p>}
    </>
  );
}
