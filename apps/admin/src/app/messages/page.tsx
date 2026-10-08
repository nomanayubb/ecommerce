"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface M { id: string; name: string; email: string; phone: string | null; message: string; status: "NEW" | "DONE"; created_at: string }

export default function Messages() {
  const [rows, setRows] = useState<M[]>([]);
  const [filter, setFilter] = useState("NEW");
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api<M[]>(`/admin/messages${filter ? `?status=${filter}` : ""}`).then(setRows).catch((e) => setMsg(e.message)), [filter]);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Messages</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded border border-line bg-card px-3 py-1.5 text-sm"><option value="NEW">To answer</option><option value="DONE">Answered</option><option value="">All</option></select>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted">Messages sent from the contact form. Reply by email, then mark them answered.</p>
      {msg && <p className="mb-3 text-sm text-red-500">{msg}</p>}
      <ul className="space-y-3">
        {rows.map((m) => (
          <li key={m.id} className="rounded border border-line p-4 text-sm">
            <p className="text-xs text-muted">{m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ""} · {new Date(m.created_at).toLocaleString()}</p>
            <p className="mt-2 whitespace-pre-line">{m.message}</p>
            <button className="mt-3 text-xs underline" onClick={async () => { await api(`/admin/messages/${m.id}`, { method: "PATCH", body: JSON.stringify({ status: m.status === "NEW" ? "DONE" : "NEW" }) }); load(); }}>{m.status === "NEW" ? "Mark answered" : "Mark as new"}</button>
          </li>
        ))}
        {rows.length === 0 && <li className="text-muted">No messages.</li>}
      </ul>
    </>
  );
}
