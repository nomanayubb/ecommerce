"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, pkr, type AdminProduct } from "@/lib/api";
import { BulkPanel } from "@/components/BulkPanel";

type Edit = { sellingPrice?: number; stockQuantity?: number; status?: AdminProduct["status"] };

export default function Products() {
  const [rows, setRows] = useState<AdminProduct[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [applied, setApplied] = useState("");
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const load = (search = applied, pg = page) => {
    api<AdminProduct[]>(`/admin/products?q=${encodeURIComponent(search)}&page=${pg}`).then(setRows).catch((e) => setMsg(e.message));
    api<{ total: number }>(`/admin/products/count?q=${encodeURIComponent(search)}`).then((r) => setTotal(r.total)).catch(() => {});
  };
  useEffect(() => { load(applied, page); }, [page, applied]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (id: string, patch: Edit) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  const dirty = Object.keys(edits).length;

  async function save() {
    try {
      await api("/admin/products/bulk", {
        method: "PUT",
        body: JSON.stringify({ updates: Object.entries(edits).map(([id, e]) => ({ id, ...e })) }),
      });
      setEdits({});
      setMsg("Saved");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    }
  }

  const cell = "border-b border-line px-2 py-2";
  const input = "w-24 rounded border border-line bg-card px-2 py-1";
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Products</h1>
        <form onSubmit={(e) => { e.preventDefault(); setSel([]); setPage(1); setApplied(q.trim()); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or SKU" className="rounded border border-line bg-card px-3 py-1.5 text-sm" />
        </form>
        <button disabled={!dirty} onClick={save} className="rounded bg-brand px-4 py-1.5 text-sm text-onbrand disabled:opacity-40">
          Save {dirty || ""} change{dirty === 1 ? "" : "s"}
        </button>
        <Link href="/products/new" className="rounded border border-line px-4 py-1.5 text-sm">New product</Link>
      </div>
      {msg && <p className="mb-2 text-sm text-muted">{msg}</p>}
      <BulkPanel endpoint="/admin/products/bulk-edit" selected={sel} total={total} scopeLabel={applied ? `products matching "${applied}"` : "products in the shop"} extra={applied ? { filterQ: applied } : undefined} onDone={() => { setSel([]); load(); }} />
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr><th className={cell}><input type="checkbox" aria-label="Select all shown" checked={rows.length > 0 && sel.length === rows.length} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])} /></th><th className={cell}>Product</th><th className={cell}>SKU</th><th className={cell}>Price</th><th className={cell}>Stock</th><th className={cell}>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const e = edits[p.id] ?? {};
            return (
              <tr key={p.id} className={edits[p.id] ? "bg-brand/5" : ""}>
                <td className={cell}><input type="checkbox" aria-label={`Select ${p.title}`} checked={sel.includes(p.id)} onChange={() => toggle(p.id)} /></td>
                <td className={cell}><Link href={`/products/edit?id=${p.id}`} className="underline-offset-4 hover:underline">{p.title}</Link></td>
                <td className={`${cell} text-muted`}>{p.sku}</td>
                <td className={cell}>
                  <input type="number" min={0} className={input} value={e.sellingPrice ?? Number(p.selling_price)} onChange={(ev) => edit(p.id, { sellingPrice: Number(ev.target.value) })} />
                </td>
                <td className={cell}>
                  <input type="number" min={0} className={input} value={e.stockQuantity ?? p.stock_quantity} onChange={(ev) => edit(p.id, { stockQuantity: Number(ev.target.value) })} />
                </td>
                <td className={cell}>
                  <select className={input} value={e.status ?? p.status} onChange={(ev) => edit(p.id, { status: ev.target.value as AdminProduct["status"] })}>
                    <option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mt-4 text-muted">No products.</p>}
      <div className="mt-4 flex items-center gap-4 text-sm text-muted">
        <button disabled={page <= 1} onClick={() => { setSel([]); setPage((p) => p - 1); }} className="rounded border border-line px-3 py-1 disabled:opacity-40">← Previous</button>
        <span>Page {page} of {Math.max(1, Math.ceil(total / 100))} · {total.toLocaleString()} products</span>
        <button disabled={page >= Math.ceil(total / 100)} onClick={() => { setSel([]); setPage((p) => p + 1); }} className="rounded border border-line px-3 py-1 disabled:opacity-40">Next →</button>
      </div>
      <p className="mt-3 text-xs text-muted">Unused prices: {pkr(0)} — edits are saved together with the Save button.</p>
    </>
  );
}
