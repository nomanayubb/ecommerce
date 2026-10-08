"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Q { id: string; name: string; question: string; answer: string | null; status: "PENDING" | "APPROVED" | "HIDDEN"; created_at: string; product_title: string; product_slug: string }
const STORE = process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000";

export default function Questions() {
  const [rows, setRows] = useState<Q[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const load = useCallback((s = filter) => api<Q[]>(`/admin/qa${s ? `?status=${s}` : ""}`).then(setRows).catch((e) => setMsg(e.message)), [filter]);
  useEffect(() => { load(); }, [load]);

  async function act(q: Q, status: Q["status"]) {
    setMsg("");
    try {
      await api(`/admin/qa/${q.id}`, { method: "PATCH", body: JSON.stringify({ answer: draft[q.id] ?? q.answer ?? "", status }) });
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Questions</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded border border-line bg-card px-3 py-1.5 text-sm">
          <option value="PENDING">Waiting for an answer</option><option value="APPROVED">Published</option><option value="HIDDEN">Hidden</option><option value="">All</option>
        </select>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted">Customer questions from product pages. Write an answer and publish it; unanswered questions never appear on the shop.</p>
      {msg && <p className="mb-3 text-sm text-red-500">{msg}</p>}
      <ul className="space-y-4">
        {rows.map((q) => (
          <li key={q.id} className="rounded border border-line p-4 text-sm">
            <p className="text-xs text-muted">{q.product_title} · {q.name} · {new Date(q.created_at).toLocaleString()} · {q.status} · <a className="underline" target="_blank" rel="noreferrer" href={`${STORE}/products/${q.product_slug}`}>view page</a></p>
            <p className="mt-2 font-medium">{q.question}</p>
            <textarea rows={2} value={draft[q.id] ?? q.answer ?? ""} onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })} placeholder="Your answer" className="mt-3 w-full rounded border border-line bg-card px-3 py-2" />
            <div className="mt-2 flex gap-3">
              <button onClick={() => act(q, "APPROVED")} disabled={!(draft[q.id] ?? q.answer)} className="rounded bg-brand px-4 py-1.5 text-onbrand disabled:opacity-40">{q.status === "APPROVED" ? "Update answer" : "Answer and publish"}</button>
              {q.status !== "HIDDEN" && <button onClick={() => act(q, "HIDDEN")} className="rounded border border-line px-4 py-1.5">Hide</button>}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-muted">Nothing here.</li>}
      </ul>
    </>
  );
}
