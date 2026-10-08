"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type CategoryNode } from "@/lib/api";

const flatten = (nodes: CategoryNode[], depth = 0): { id: string; label: string }[] =>
  nodes.flatMap((n) => [{ id: n.id, label: `${"— ".repeat(depth)}${n.name}` }, ...flatten(n.children, depth + 1)]);

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function NewProduct() {
  const router = useRouter();
  const [cats, setCats] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<CategoryNode[]>("/categories/tree").then((t) => setCats(flatten(t))).catch(() => {}); }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title"));
    const num = (k: string) => Number(f.get(k));
    setBusy(true);
    setError("");
    try {
      await api("/admin/products", {
        method: "POST",
        body: JSON.stringify({
          title,
          slug: String(f.get("slug") || slugify(title)),
          sku: f.get("sku"),
          description: f.get("description") || undefined,
          status: f.get("status"),
          markedPrice: num("markedPrice"),
          sellingPrice: num("sellingPrice"),
          wholesalePrice: f.get("wholesalePrice") ? num("wholesalePrice") : null,
          stockQuantity: num("stock"),
          moq: num("moq") || 1,
          images: String(f.get("images") || "").split("\n").map((s) => s.trim()).filter(Boolean),
          tags: String(f.get("tags") || "").split(",").map((s) => s.trim()).filter(Boolean),
          categoryIds: f.get("category") ? [f.get("category")] : [],
        }),
      });
      router.push("/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded border border-line bg-card px-3 py-2";
  const label = "block text-sm text-muted";
  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">New product</h1>
      <label className={label}>Title<input name="title" required className={input} /></label>
      <div className="grid grid-cols-2 gap-4">
        <label className={label}>SKU<input name="sku" required className={input} /></label>
        <label className={label}>Slug (auto if empty)<input name="slug" pattern="[a-z0-9-]+" className={input} /></label>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <label className={label}>Marked price<input name="markedPrice" type="number" min={0} required className={input} /></label>
        <label className={label}>Selling price<input name="sellingPrice" type="number" min={0} required className={input} /></label>
        <label className={label}>Wholesale price<input name="wholesalePrice" type="number" min={0} className={input} /></label>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <label className={label}>Stock<input name="stock" type="number" min={0} defaultValue={0} className={input} /></label>
        <label className={label}>Min. order qty<input name="moq" type="number" min={1} defaultValue={1} className={input} /></label>
        <label className={label}>Status
          <select name="status" defaultValue="DRAFT" className={input}><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select>
        </label>
      </div>
      <label className={label}>Category
        <select name="category" className={input}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      </label>
      <label className={label}>Image URLs (one per line)<textarea name="images" rows={3} className={input} /></label>
      <label className={label}>Tags (comma separated)<input name="tags" className={input} /></label>
      <label className={label}>Description<textarea name="description" rows={4} className={input} /></label>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <button disabled={busy} className="rounded bg-brand px-6 py-2 font-medium text-onbrand disabled:opacity-50">{busy ? "Saving…" : "Create product"}</button>
    </form>
  );
}
