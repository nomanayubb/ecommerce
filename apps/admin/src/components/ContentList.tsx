"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Row = { id: string; title: string; slug: string; status: string; created_at: string } & Record<string, unknown>;

/** Shared list screen for recipes, posts and bundles: title, status, edit link, delete. */
export function ContentList({ title, intro, path, editBase, extra }: { title: string; intro: string; path: string; editBase: string; extra?: (r: Row) => string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api<Row[]>(`/admin/${path}`).then(setRows).catch((e) => setMsg(e.message)), [path]);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">{title}</h1>
        <Link href={`${editBase}?id=new`} className="rounded bg-brand px-4 py-2 text-sm font-medium text-onbrand">New</Link>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted">{intro}</p>
      {msg && <p className="mb-3 text-sm text-red-500">{msg}</p>}
      <table className="w-full text-left text-sm">
        <thead className="text-muted"><tr>{["Title", "Address", "Status", "Details", ""].map((h) => <th key={h} className="border-b border-line px-2 py-2">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="border-b border-line px-2 py-3 font-medium"><Link href={`${editBase}?id=${r.id}`} className="hover:underline">{r.title}</Link></td>
              <td className="border-b border-line px-2 py-3 text-muted">{r.slug}</td>
              <td className="border-b border-line px-2 py-3">{r.status === "PUBLISHED" ? "Published" : "Draft"}</td>
              <td className="border-b border-line px-2 py-3 text-xs text-muted">{extra?.(r)}</td>
              <td className="border-b border-line px-2 py-3 text-right"><button className="text-xs text-red-500 underline" onClick={async () => { if (confirm(`Delete "${r.title}"?`)) { await api(`/admin/${path}/${r.id}`, { method: "DELETE" }).catch((e) => setMsg(e.message)); load(); } }}>Delete</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="px-2 py-8 text-center text-muted">Nothing yet.</td></tr>}
        </tbody>
      </table>
    </>
  );
}

export const field = "w-full rounded border border-line bg-card px-3 py-2 text-sm";
export const lab = "block text-xs font-medium text-muted";
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
export const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
export const csv = (s: string) => s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
