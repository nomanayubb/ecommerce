"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { field, lab, lines, slugify } from "@/components/ContentList";

interface Bundle { slug: string; title: string; description: string; imageUrl: string; curator: string; items: { slug: string; qty: number }[]; status: "DRAFT" | "PUBLISHED" }
const BLANK: Bundle = { slug: "", title: "", description: "", imageUrl: "", curator: "", items: [], status: "DRAFT" };

function Editor() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const [b, setB] = useState<Bundle>(BLANK);
  const [items, setItems] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id || id === "new") return;
    api<Bundle>(`/admin/bundles/${id}`).then((x) => { setB(x); setItems(x.items.map((i) => `${i.slug} | ${i.qty}`).join("\n")); }).catch((e) => setMsg({ ok: false, text: e.message }));
  }, [id]);
  const set = <K extends keyof Bundle>(k: K, v: Bundle[K]) => setB((c) => ({ ...c, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const body = { ...b, slug: b.slug || slugify(b.title), items: lines(items).map((l) => { const [slug, q] = l.split("|").map((x) => x.trim()); return { slug, qty: Number(q) || 1 }; }) };
    try {
      if (id === "new") { const res = await api<{ id: string }>("/admin/bundles", { method: "POST", body: JSON.stringify(body) }); router.replace(`/bundles/edit?id=${res.id}`); }
      else await api(`/admin/bundles/${id}`, { method: "PUT", body: JSON.stringify(body) });
      setMsg({ ok: true, text: "Saved." });
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed" }); }
    setBusy(false);
  }
  return (
    <form onSubmit={save} className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3"><h1 className="mr-auto text-2xl font-bold">{id === "new" ? "New bundle" : "Edit bundle"}</h1><Link href="/bundles" className="text-sm underline">Back</Link><button disabled={busy} className="rounded bg-brand px-6 py-2 text-sm font-medium text-onbrand disabled:opacity-50">{busy ? "Saving..." : "Save"}</button></div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</p>}
      <label className={lab}>Title<input required className={field} value={b.title} onChange={(e) => set("title", e.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={lab}>Page address<input pattern="[a-z0-9-]+" className={field} placeholder="auto from title" value={b.slug} onChange={(e) => set("slug", e.target.value)} /></label>
        <label className={lab}>Photo address<input className={field} value={b.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} /></label>
        <label className={lab}>Status<select className={field} value={b.status} onChange={(e) => set("status", e.target.value as Bundle["status"])}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
      </div>
      <label className={lab}>Why this set (shown to shoppers)<textarea rows={3} maxLength={600} className={field} value={b.description} onChange={(e) => set("description", e.target.value)} /></label>
      <label className={lab}>Picked by (chef / expert name, optional)<input className={field} value={b.curator} onChange={(e) => set("curator", e.target.value)} /></label>
      <label className={lab}>Products, one per line: product page address | quantity<textarea rows={6} required className={`${field} font-mono`} placeholder={"nova-chef-pan-set | 1\napex-electric-kettle | 1"} value={items} onChange={(e) => setItems(e.target.value)} /></label>
      <p className="text-xs text-muted">The price is the sum of the products' current prices. Shoppers add the whole set to the bag in one tap.</p>
    </form>
  );
}
export default function EditBundle() {
  return <Suspense fallback={<p className="text-muted">Loading...</p>}><Editor /></Suspense>;
}
