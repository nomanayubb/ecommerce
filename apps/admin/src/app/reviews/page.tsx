"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Review { id: string; rating: number; title: string | null; body: string; verified: boolean; status: "PENDING" | "APPROVED" | "REJECTED"; helpful_count: number; created_at: string; product_title: string; author: string; email: string }

export default function Reviews() {
  const [rows, setRows] = useState<Review[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [msg, setMsg] = useState("");

  const load = (status = filter) => api<Review[]>(`/admin/reviews${status ? `?status=${status}` : ""}`).then(setRows).catch((e) => setMsg(e.message));
  useEffect(() => { load(filter); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function set(id: string, status: Review["status"]) {
    try { await api(`/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Update failed"); }
  }

  const btn = "rounded border border-line px-3 py-1 text-xs transition hover:border-accent hover:text-accent";
  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Reviews</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded border border-line bg-card px-3 py-1.5 text-sm">
          <option value="PENDING">Waiting for approval</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="">All</option>
        </select>
      </div>
      {msg && <p className="mb-2 text-sm text-red-500">{msg}</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded border border-line bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-accent">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></span>
              <span className="font-medium">{r.product_title}</span>
              {r.verified && <span className="rounded border border-accent px-2 py-0.5 text-[0.65rem] uppercase tracking-widest text-accent">Verified buyer</span>}
              <span className="ml-auto text-xs uppercase tracking-widest text-muted">{r.status}</span>
            </div>
            {r.title && <p className="mt-2 font-medium">{r.title}</p>}
            <p className="mt-1 text-muted">{r.body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="mr-auto text-xs text-muted">{r.author} ({r.email}) · {new Date(r.created_at).toLocaleDateString()} · {r.helpful_count} helpful</span>
              {r.status !== "APPROVED" && <button className={btn} onClick={() => set(r.id, "APPROVED")}>Approve</button>}
              {r.status !== "REJECTED" && <button className={btn} onClick={() => set(r.id, "REJECTED")}>Reject</button>}
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="mt-6 text-muted">Nothing here.</p>}
    </>
  );
}
