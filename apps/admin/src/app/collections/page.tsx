"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Row { id: string; name: string; slug: string; image_url: string | null; parent_id: string | null; is_active: boolean; product_count: number }
const input = "rounded border border-line bg-card px-3 py-2 text-sm";

export default function Collections() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api<Row[]>("/admin/collections").then(setRows).catch((e) => setMsg(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setMsg("");
    try {
      const r = await api<{ id: string }>("/admin/collections", { method: "POST", body: JSON.stringify({ name: f.get("name"), slug: f.get("slug") || "", parentId: f.get("parentId") || null }) });
      window.location.href = `/collections/edit?id=${r.id}`;
    } catch (err) { setMsg(err instanceof Error ? err.message : "Could not create collection"); }
  }

  const name = (id: string | null) => rows.find((r) => r.id === id)?.name;
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Collections</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">A collection is a group of products, like Summer, Kitchen or Under Rs. 2,000. Create one, open it and add the products you want in it. It then appears in the shop menu and on its own collection page. A collection can sit inside another one (for example Jackets inside Men).</p>
      {msg && <p className="mb-3 text-sm text-red-500">{msg}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="text-muted"><tr>{["Collection", "Products", "Inside", "Status", ""].map((h) => <th key={h} className="border-b border-line px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="border-b border-line px-2 py-3 font-medium"><Link href={`/collections/edit?id=${r.id}`} className="hover:text-accent">{r.name}</Link><span className="ml-2 text-xs text-muted">/{r.slug}</span></td>
                <td className="border-b border-line px-2 py-3">{r.product_count}</td>
                <td className="border-b border-line px-2 py-3 text-muted">{name(r.parent_id) ?? "-"}</td>
                <td className="border-b border-line px-2 py-3">{r.is_active ? <span className="text-accent">Visible</span> : <span className="text-muted">Hidden</span>}</td>
                <td className="border-b border-line px-2 py-3 text-right">
                  <Link href={`/collections/edit?id=${r.id}`} className="mr-4 text-accent hover:underline">Edit</Link>
                  <button className="text-muted hover:text-red-500" onClick={async () => { if (confirm(`Delete the collection "${r.name}"? The products stay in your shop.`)) { await api(`/admin/collections/${r.id}`, { method: "DELETE" }).catch((e) => setMsg(e.message)); load(); } }}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-2 py-6 text-muted">No collections yet. Create your first one below.</td></tr>}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="mt-10 max-w-xl space-y-3 rounded border border-line bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest">Create collection</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">Title<input name="name" required maxLength={120} placeholder="Summer sale" className={`mt-1 w-full ${input}`} /></label>
          <label className="text-xs text-muted">Address (optional, made from the title)<input name="slug" pattern="[a-z0-9-]*" maxLength={80} placeholder="summer-sale" className={`mt-1 w-full ${input}`} /></label>
          <label className="text-xs text-muted sm:col-span-2">Inside another collection (optional)
            <select name="parentId" className={`mt-1 w-full ${input}`}><option value="">No, top level</option>{rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          </label>
        </div>
        <button className="rounded bg-brand px-5 py-2 text-sm font-medium text-onbrand">Create and add products</button>
      </form>
    </>
  );
}
