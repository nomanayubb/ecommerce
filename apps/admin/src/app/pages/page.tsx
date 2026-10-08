"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Row { key: string; title: string; is_published: boolean; updated_at: string; published_at: string | null }
const STORE = process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000";

export default function Pages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api<Row[]>("/admin/templates").then(setRows).catch((e) => setMsg(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setMsg("");
    try {
      const r = await api<{ key: string }>("/admin/templates/create", { method: "POST", body: JSON.stringify({ title: f.get("title"), slug: f.get("slug") }) });
      window.location.href = `/pages/edit?key=${encodeURIComponent(r.key)}`;
    } catch (err) { setMsg(err instanceof Error ? err.message : "Could not create page"); }
  }

  const input = "rounded border border-line bg-card px-3 py-2 text-sm";
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Pages</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">Every page is built from sections you can reorder, edit and reuse. Save drafts, preview them, then publish. Earlier published versions can be restored.</p>
      {msg && <p className="mb-3 text-sm text-red-500">{msg}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-muted"><tr>{["Page", "Address", "Status", "Last edited", ""].map((h) => <th key={h} className="border-b border-line px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => {
              const path = r.key === "home" ? "/" : `/p/${r.key.slice(5)}`;
              return (
                <tr key={r.key}>
                  <td className="border-b border-line px-2 py-3 font-medium">{r.title}</td>
                  <td className="border-b border-line px-2 py-3 text-muted">{path}</td>
                  <td className="border-b border-line px-2 py-3">{r.is_published ? <span className="text-accent">Published</span> : <span className="text-muted">{r.key === "home" ? "Built-in layout" : "Draft"}</span>}</td>
                  <td className="border-b border-line px-2 py-3 text-muted">{new Date(r.updated_at).toLocaleDateString()}</td>
                  <td className="border-b border-line px-2 py-3 text-right">
                    <Link href={`/pages/edit?key=${encodeURIComponent(r.key)}`} className="mr-4 text-accent hover:underline">Edit</Link>
                    {(r.key === "home" || r.is_published) && <a href={`${STORE}${path}`} target="_blank" rel="noopener noreferrer" className="mr-4 text-muted hover:text-accent">View</a>}
                    {r.key !== "home" && <button className="text-muted hover:text-red-500" onClick={async () => { if (confirm(`Delete "${r.title}"?`)) { await api(`/admin/templates/item?key=${encodeURIComponent(r.key)}`, { method: "DELETE" }).catch((e) => setMsg(e.message)); load(); } }}>Delete</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="mt-10 max-w-xl space-y-3 rounded border border-line bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest">New page</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">Title<input name="title" required maxLength={80} placeholder="About us" className={`mt-1 w-full ${input}`} /></label>
          <label className="text-xs text-muted">Address (after /p/)<input name="slug" required pattern="[a-z0-9-]{1,60}" placeholder="about" className={`mt-1 w-full ${input}`} /></label>
        </div>
        <button className="rounded bg-brand px-5 py-2 text-sm font-medium text-onbrand">Create and edit</button>
      </form>
    </>
  );
}
