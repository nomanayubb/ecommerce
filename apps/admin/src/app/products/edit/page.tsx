"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type CategoryNode } from "@/lib/api";

interface Variant { id?: string; title: string; sku: string; price: number; stockQuantity: number; attributes: Record<string, string>; imageIndex: number | null }
interface Product {
  id: string; title: string; slug: string; sku: string; description: string | null; status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  markedPrice: number; sellingPrice: number; wholesalePrice: number | null; brandId: string | null; stockQuantity: number; moq: number;
  images: string[]; tags: string[]; model3dUrl: string;
  meta: { videoUrl: string; spinImages: string[]; sizeGuide: { note: string; columns: string[]; rows: string[][] } | null; specs: { label: string; value: string }[]; care: string[]; material: string; materialNote: string };
  categoryIds: string[]; variants: Variant[]; priceTiers: { minQty: number; unitPrice: number }[];
}

const flatten = (nodes: CategoryNode[], depth = 0): { id: string; label: string }[] =>
  nodes.flatMap((n) => [{ id: n.id, label: `${"— ".repeat(depth)}${n.name}` }, ...flatten(n.children, depth + 1)]);
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const input = "w-full rounded border border-line bg-card px-3 py-2 text-sm";
const label = "block text-xs font-medium text-muted";
const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <fieldset className="space-y-3 rounded border border-line p-4">
    <legend className="px-2 text-sm font-semibold">{title}</legend>
    {hint && <p className="text-xs text-muted">{hint}</p>}
    {children}
  </fieldset>
);

function Editor() {
  const id = useSearchParams().get("id");
  const [p, setP] = useState<Product | null>(null);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [cats, setCats] = useState<{ id: string; label: string }[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Free-text editors for list-like fields (kept as text while typing).
  const [t, setT] = useState({ images: "", spin: "", specs: "", care: "", tiers: "", tags: "", guideCols: "", guideRows: "" });

  useEffect(() => {
    if (!id) return;
    Promise.all([api<Product>(`/admin/products/${id}`), api<{ id: string; name: string }[]>("/admin/brands"), api<CategoryNode[]>("/categories/tree")])
      .then(([prod, b, tree]) => {
        setP(prod); setBrands(b); setCats(flatten(tree));
        setT({
          images: prod.images.join("\n"), spin: prod.meta.spinImages.join("\n"),
          specs: prod.meta.specs.map((s) => `${s.label} | ${s.value}`).join("\n"), care: prod.meta.care.join("\n"),
          tiers: prod.priceTiers.map((x) => `${x.minQty} | ${x.unitPrice}`).join("\n"), tags: prod.tags.join(", "),
          guideCols: prod.meta.sizeGuide?.columns.join(", ") ?? "", guideRows: prod.meta.sizeGuide?.rows.map((r) => r.join(", ")).join("\n") ?? "",
        });
      })
      .catch((e) => setMsg({ ok: false, text: e.message }));
  }, [id]);

  if (!id) return <p>Missing product. <Link href="/products" className="underline">Back to products</Link></p>;
  if (!p) return <p className="text-muted">{msg?.text ?? "Loading..."}</p>;
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((cur) => (cur ? { ...cur, [k]: v } : cur));
  const setMeta = (patch: Partial<Product["meta"]>) => setP((cur) => (cur ? { ...cur, meta: { ...cur.meta, ...patch } } : cur));
  const setVariant = (i: number, patch: Partial<Variant>) => setP((cur) => (cur ? { ...cur, variants: cur.variants.map((v, n) => (n === i ? { ...v, ...patch } : v)) } : cur));
  const setAttr = (i: number, key: string, value: string) =>
    setP((cur) => {
      if (!cur) return cur;
      return { ...cur, variants: cur.variants.map((v, n) => {
        if (n !== i) return v;
        const attributes = { ...v.attributes };
        if (value) attributes[key] = value; else delete attributes[key];
        return { ...v, attributes };
      }) };
    });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const pr = p as Product;
    setBusy(true); setMsg(null);
    try {
      const images = lines(t.images);
      const cols = t.guideCols.split(",").map((s) => s.trim()).filter(Boolean);
      const rows = lines(t.guideRows).map((r) => r.split(",").map((s) => s.trim()));
      const body = {
        ...pr,
        description: pr.description || null,
        images,
        tags: t.tags.split(",").map((s) => s.trim()).filter(Boolean),
        priceTiers: lines(t.tiers).map((l) => { const [q, u] = l.split("|"); return { minQty: Number(q), unitPrice: Number(u) }; }),
        meta: {
          ...pr.meta,
          spinImages: lines(t.spin),
          specs: lines(t.specs).map((l) => { const [a, ...b] = l.split("|"); return { label: a.trim(), value: b.join("|").trim() }; }).filter((s) => s.label && s.value),
          care: lines(t.care),
          sizeGuide: cols.length >= 2 && rows.length ? { note: pr.meta.sizeGuide?.note ?? "", columns: cols, rows } : null,
        },
      };
      await api(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(body) });
      setMsg({ ok: true, text: "Saved. The storefront updates within about a minute." });
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed" }); }
    setBusy(false);
  }

  const imgList = lines(t.images);
  return (
    <form onSubmit={save} className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Edit product</h1>
        <Link href="/products" className="text-sm underline">Back to list</Link>
        <button disabled={busy} className="rounded bg-brand px-6 py-2 text-sm font-medium text-onbrand disabled:opacity-50">{busy ? "Saving..." : "Save product"}</button>
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</p>}

      <Section title="Basics">
        <label className={label}>Title<input required className={input} value={p.title} onChange={(e) => set("title", e.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>SKU<input required className={input} value={p.sku} onChange={(e) => set("sku", e.target.value)} /></label>
          <label className={label}>Page address<input required pattern="[a-z0-9-]+" className={input} value={p.slug} onChange={(e) => set("slug", e.target.value)} /></label>
          <label className={label}>Status<select className={input} value={p.status} onChange={(e) => set("status", e.target.value as Product["status"])}><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></label>
        </div>
        <label className={label}>Description<textarea rows={5} className={input} value={p.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
      </Section>

      <Section title="Price and stock">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>Marked price (before discount)<input type="number" min={0} className={input} value={p.markedPrice} onChange={(e) => set("markedPrice", Number(e.target.value))} /></label>
          <label className={label}>Selling price<input type="number" min={0} className={input} value={p.sellingPrice} onChange={(e) => set("sellingPrice", Number(e.target.value))} /></label>
          <label className={label}>Wholesale price (optional)<input type="number" min={0} className={input} value={p.wholesalePrice ?? ""} onChange={(e) => set("wholesalePrice", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <label className={label}>Stock (when it has no variants)<input type="number" min={0} className={input} value={p.stockQuantity} onChange={(e) => set("stockQuantity", Number(e.target.value))} /></label>
          <label className={label}>Minimum order quantity<input type="number" min={1} className={input} value={p.moq} onChange={(e) => set("moq", Number(e.target.value))} /></label>
        </div>
        <label className={label}>Bulk price tiers, one per line: quantity | unit price (e.g. 5 | 5499)<textarea rows={2} className={input} value={t.tiers} onChange={(e) => setT({ ...t, tiers: e.target.value })} /></label>
      </Section>

      <Section title="Organise">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Brand<select className={input} value={p.brandId ?? ""} onChange={(e) => set("brandId", e.target.value || null)}><option value="">None</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label className={label}>Categories (hold Ctrl to pick several)<select multiple size={5} className={input} value={p.categoryIds} onChange={(e) => set("categoryIds", [...e.target.selectedOptions].map((o) => o.value))}>{cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        </div>
        <label className={label}>Tags, comma separated. Tags like <code>dishwasher-safe, oven-safe, microwave-safe, freezer-safe, induction, bpa-free, vegan, halal, gluten-free, eco, gift</code> show icons on the storefront; <code>bestseller, new, limited</code> show badges<input className={input} value={t.tags} onChange={(e) => setT({ ...t, tags: e.target.value })} /></label>
      </Section>

      <Section title="Photos, video, 360 and 3D" hint="Paste web addresses (or /path on the storefront). The first photo is the main one.">
        <label className={label}>Photos, one address per line<textarea rows={4} className={input} value={t.images} onChange={(e) => setT({ ...t, images: e.target.value })} /></label>
        <label className={label}>Video (an .mp4 / .webm address, or a YouTube / Vimeo link)<input className={input} value={p.meta.videoUrl} onChange={(e) => setMeta({ videoUrl: e.target.value })} /></label>
        <label className={label}>360 view: the frames of one full turn, in order, one address per line (12 to 36 frames work well)<textarea rows={3} className={input} value={t.spin} onChange={(e) => setT({ ...t, spin: e.target.value })} /></label>
        <label className={label}>3D model / AR (.glb address). Shoppers can rotate it and view it in their room on supported phones<input className={input} value={p.model3dUrl} onChange={(e) => set("model3dUrl", e.target.value)} /></label>
      </Section>

      <Section title="Variants" hint="Colour and size choices. Give a colour its swatch (hex like #1c1c1e) and the photo number it should show (1 = first photo).">
        {p.variants.length === 0 && <p className="text-sm text-muted">No variants. The product sells as a single item.</p>}
        <div className="space-y-3">
          {p.variants.map((v, i) => (
            <div key={v.id ?? i} className="grid gap-2 rounded border border-line p-3 sm:grid-cols-6">
              <label className={`${label} sm:col-span-2`}>Name<input className={input} value={v.title} onChange={(e) => setVariant(i, { title: e.target.value })} placeholder="Black / M" /></label>
              <label className={label}>SKU<input className={input} value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} /></label>
              <label className={label}>Price<input type="number" min={0} className={input} value={v.price} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} /></label>
              <label className={label}>Stock<input type="number" min={0} className={input} value={v.stockQuantity} onChange={(e) => setVariant(i, { stockQuantity: Number(e.target.value) })} /></label>
              <label className={label}>Photo no.<input type="number" min={1} max={Math.max(1, imgList.length)} className={input} value={v.imageIndex == null ? "" : v.imageIndex + 1} onChange={(e) => setVariant(i, { imageIndex: e.target.value === "" ? null : Math.max(0, Number(e.target.value) - 1) })} /></label>
              <label className={label}>Colour<input className={input} value={v.attributes.color ?? ""} onChange={(e) => setAttr(i, "color", e.target.value)} /></label>
              <label className={label}>Swatch hex<input className={input} placeholder="#1c1c1e" pattern="#[0-9a-fA-F]{6}" value={v.attributes.colorHex ?? ""} onChange={(e) => setAttr(i, "colorHex", e.target.value)} /></label>
              <label className={label}>Size<input className={input} value={v.attributes.size ?? ""} onChange={(e) => setAttr(i, "size", e.target.value)} /></label>
              <div className="flex items-end sm:col-span-3"><button type="button" className="text-xs text-red-500 underline" onClick={() => set("variants", p.variants.filter((_, n) => n !== i))}>Remove variant</button></div>
            </div>
          ))}
        </div>
        <button type="button" className="rounded border border-line px-3 py-1.5 text-sm" onClick={() => set("variants", [...p.variants, { title: "", sku: `${p.sku}-${p.variants.length + 1}`, price: p.sellingPrice, stockQuantity: 0, attributes: {}, imageIndex: null }])}>Add variant</button>
      </Section>

      <Section title="Size guide" hint="Shown in a pop-up next to the size choice, with a small size finder. Write ranges like 86-91 so the finder can match a measurement.">
        <label className={label}>Columns, comma separated (first column is the size name)<input className={input} placeholder="Size, Chest (cm), Waist (cm)" value={t.guideCols} onChange={(e) => setT({ ...t, guideCols: e.target.value })} /></label>
        <label className={label}>Rows, one per line, same order<textarea rows={4} className={input} placeholder={"S, 86-91, 71-76\nM, 96-101, 81-86"} value={t.guideRows} onChange={(e) => setT({ ...t, guideRows: e.target.value })} /></label>
        <label className={label}>How to measure (optional)<input className={input} maxLength={400} value={p.meta.sizeGuide?.note ?? ""} onChange={(e) => setMeta({ sizeGuide: { note: e.target.value, columns: p.meta.sizeGuide?.columns ?? [], rows: p.meta.sizeGuide?.rows ?? [] } })} /></label>
      </Section>

      <Section title="Details shown on the product page">
        <label className={label}>Specifications, one per line: label | value<textarea rows={4} className={input} placeholder={"Capacity | 1.7 litres\nPower | 2200 W"} value={t.specs} onChange={(e) => setT({ ...t, specs: e.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Main material (e.g. Cast iron, Ceramic, Cotton)<input className={input} value={p.meta.material} onChange={(e) => setMeta({ material: e.target.value })} /></label>
          <label className={label}>What that material means for the buyer<input className={input} maxLength={500} value={p.meta.materialNote} onChange={(e) => setMeta({ materialNote: e.target.value })} /></label>
        </div>
        <label className={label}>Care steps, one per line (shown as a step-by-step guide)<textarea rows={4} className={input} value={t.care} onChange={(e) => setT({ ...t, care: e.target.value })} /></label>
      </Section>

      <div className="flex items-center gap-3">
        <button disabled={busy} className="rounded bg-brand px-6 py-2 text-sm font-medium text-onbrand disabled:opacity-50">{busy ? "Saving..." : "Save product"}</button>
        <button type="button" className="text-sm text-red-500 underline" onClick={async () => { if (confirm("Archive this product? It disappears from the shop; past orders keep it.")) { await api(`/admin/products/${id}`, { method: "DELETE" }); set("status", "ARCHIVED"); setMsg({ ok: true, text: "Archived." }); } }}>Archive product</button>
      </div>
    </form>
  );
}

export default function EditProduct() {
  return <Suspense fallback={<p className="text-muted">Loading...</p>}><Editor /></Suspense>;
}
