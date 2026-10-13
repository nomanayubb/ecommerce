"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, pkr } from "@/lib/api";
import { BulkPanel } from "@/components/BulkPanel";

interface CProduct { id: string; title: string; slug: string; status: string; image: string | null; selling_price: string; stock_quantity: number }
interface Coll { id: string; name: string; slug: string; description: string | null; image_url: string | null; parent_id: string | null; is_active: boolean; sort_order: number; products: CProduct[] }
interface AllProduct { id: string; title: string; slug: string; status: string; images: string[]; selling_price: string }
interface Row { id: string; name: string }
const input = "w-full rounded border border-line bg-card px-3 py-2 text-sm";
const label = "block text-xs font-medium text-muted";

function Edit() {
  const id = useSearchParams().get("id");
  const [c, setC] = useState<Coll | null>(null);
  const [all, setAll] = useState<AllProduct[]>([]);
  const [others, setOthers] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([api<Coll>(`/admin/collections/${id}`), api<Row[]>("/admin/collections")])
      .then(([col, cols]) => { setC(col); setOthers(cols.filter((x) => x.id !== id)); })
      .catch((e) => setMsg({ ok: false, text: e.message }));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // Product search runs on the server (the shop can have tens of thousands of products).
  useEffect(() => {
    const t = setTimeout(() => { api<AllProduct[]>(`/admin/products?q=${encodeURIComponent(q.trim())}`).then(setAll).catch(() => {}); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const inIds = useMemo(() => new Set(c?.products.map((p) => p.id)), [c]);
  const matches = useMemo(() => all.filter((p) => !inIds.has(p.id)).slice(0, 12), [all, inIds]);

  if (!id) return <p>Missing collection. <Link href="/collections" className="underline">Back to collections</Link></p>;
  if (!c) return <p className="text-muted">{msg?.text ?? "Loading..."}</p>;
  const set = <K extends keyof Coll>(k: K, v: Coll[K]) => setC((cur) => (cur ? { ...cur, [k]: v } : cur));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api(`/admin/collections/${id}`, { method: "PUT", body: JSON.stringify({ name: c!.name, slug: c!.slug, description: c!.description ?? "", imageUrl: c!.image_url ?? "", parentId: c!.parent_id, isActive: c!.is_active, sortOrder: c!.sort_order }) });
      setMsg({ ok: true, text: "Saved" });
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save" }); }
  }
  async function setProducts(next: string[]) {
    setMsg(null);
    try { await api(`/admin/collections/${id}/products`, { method: "PUT", body: JSON.stringify({ productIds: next }) }); load(); }
    catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not update products" }); }
  }
  const ids = c.products.map((p) => p.id);
  const STORE = process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000";

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/collections" className="text-muted hover:text-accent">← Collections</Link></p>
      <h1 className="mb-6 text-2xl font-bold">{c.name}</h1>
      {msg && <p className={`mb-4 text-sm ${msg.ok ? "text-accent" : "text-red-500"}`}>{msg.text}</p>}

      <BulkPanel endpoint={`/admin/collections/${id}/bulk`} selected={sel} total={c.products.length} scopeLabel="products in this collection" onDone={() => { setSel([]); load(); }} />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={save} className="space-y-4 rounded border border-line bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest">Details</h2>
          <label className={label}>Title<input required maxLength={120} className={input} value={c.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className={label}>Address (the shop address: /collections/this-address)<input pattern="[a-z0-9-]*" maxLength={80} className={input} value={c.slug} onChange={(e) => set("slug", e.target.value)} /></label>
          <label className={label}>Description (shown at the top of the collection page)<textarea rows={3} maxLength={2000} className={input} value={c.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
          <label className={label}>Image address (optional)<input className={input} value={c.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} /></label>
          <label className={label}>Inside another collection
            <select className={input} value={c.parent_id ?? ""} onChange={(e) => set("parent_id", e.target.value || null)}><option value="">No, top level</option>{others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
          </label>
          <label className={label}>Order in menus (smaller comes first)<input type="number" min={0} className={input} value={c.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.is_active} onChange={(e) => set("is_active", e.target.checked)} />Visible in the shop</label>
          <div className="flex items-center gap-4"><button className="rounded bg-brand px-5 py-2 text-sm font-medium text-onbrand">Save</button><a href={`${STORE}/collections/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-accent">View in shop</a></div>
        </form>

        <section className="space-y-4 rounded border border-line bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest">Products in this collection ({c.products.length})</h2>
          <div>
            <label className={label}>Add products<input className={input} placeholder="Search your products" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            <ul className="mt-2 divide-y divide-line border border-line">
              {matches.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  {p.images[0] ? <img src={p.images[0]} alt="" className="h-9 w-9 object-cover" /> : <span className="h-9 w-9 bg-line" />}
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="text-xs text-muted">{pkr(p.selling_price)}</span>
                  <button type="button" onClick={() => setProducts([...ids, p.id])} className="text-accent hover:underline">Add</button>
                </li>
              ))}
              {matches.length === 0 && <li className="px-3 py-3 text-sm text-muted">{q ? "No matching products." : "Every product is already in this collection."}</li>}
            </ul>
          </div>
          {c.products.length > 0 && <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={sel.length === c.products.length} onChange={(e) => setSel(e.target.checked ? c.products.map((p) => p.id) : [])} />Select all for bulk edit</label>}
          <ul className="divide-y divide-line border border-line">
            {c.products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <input type="checkbox" aria-label={`Select ${p.title}`} checked={sel.includes(p.id)} onChange={() => setSel((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))} />
                {p.image ? <img src={p.image} alt="" className="h-9 w-9 object-cover" /> : <span className="h-9 w-9 bg-line" />}
                <span className="min-w-0 flex-1 truncate">{p.title}{p.status !== "PUBLISHED" && <span className="ml-2 text-xs text-muted">{p.status.toLowerCase()}</span>}</span>
                <span className="text-xs text-muted">{pkr(p.selling_price)}</span>
                <button type="button" onClick={() => setProducts(ids.filter((x) => x !== p.id))} className="text-muted hover:text-red-500">Remove</button>
              </li>
            ))}
            {c.products.length === 0 && <li className="px-3 py-4 text-sm text-muted">No products yet. Search above and press Add.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}

export default function CollectionEdit() {
  return <Suspense fallback={<p className="text-muted">Loading...</p>}><Edit /></Suspense>;
}
