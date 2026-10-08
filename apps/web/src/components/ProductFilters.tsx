"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CloseIcon } from "./icons";

export type Facets = {
  brands: { slug: string; name: string; count: number }[];
  tags: { tag: string; count: number }[];
  price: { min: number; max: number };
  onSale: number;
  inStock: number;
};
type Params = Record<string, string | undefined>;

const split = (v?: string) => (v ? v.split(",").filter(Boolean) : []);
const label = (t: string) => t.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** URL is the single source of truth: every change rewrites the query string and the server page re-renders. */
function useFilterNav(params: Params) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const push = (patch: Params) => {
    const next: Params = { ...params, ...patch, page: undefined };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
    start(() => router.replace(`/products${qs.size ? `?${qs}` : ""}`, { scroll: false }));
  };
  const toggle = (key: "brand" | "tag", value: string) => {
    const cur = split(params[key]);
    push({ [key]: (cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]).join(",") || undefined });
  };
  return { push, toggle, pending };
}

const Check = ({ on, children, onChange, count }: { on: boolean; children: React.ReactNode; onChange: () => void; count?: number }) => (
  <label className="flex cursor-pointer items-center gap-3 py-1 text-sm">
    <input type="checkbox" checked={on} onChange={onChange} className="h-4 w-4 accent-[rgb(var(--accent))]" />
    <span className={`flex-1 ${on ? "text-fg" : "text-muted"}`}>{children}</span>
    {count != null && <span className="text-xs text-muted">{count}</span>}
  </label>
);

export function ProductFilters({ params, facets }: { params: Params; facets: Facets }) {
  const { push, toggle, pending } = useFilterNav(params);
  const [min, setMin] = useState(params.minPrice ?? "");
  const [max, setMax] = useState(params.maxPrice ?? "");
  const brands = split(params.brand);
  const tags = split(params.tag);
  const any = !!(params.minPrice || params.maxPrice || params.inStock || params.onSale || brands.length || tags.length || params.sort);

  return (
    <div className="space-y-6" aria-busy={pending}>
      <div>
        <p className="eyebrow mb-3">Sort</p>
        <select value={params.sort ?? "newest"} onChange={(e) => push({ sort: e.target.value === "newest" ? undefined : e.target.value })} aria-label="Sort products" className="w-full border border-line bg-card px-3 py-2 text-sm">
          <option value="newest">Newest</option>
          <option value="popular">Most reviewed</option>
          <option value="rating">Top rated</option>
          <option value="discount">Biggest discount</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name">Name A to Z</option>
        </select>
      </div>

      <div>
        <p className="eyebrow mb-3">Price (Rs.)</p>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); push({ minPrice: min || undefined, maxPrice: max || undefined }); }}>
          <input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} onBlur={() => min !== (params.minPrice ?? "") && push({ minPrice: min || undefined })} placeholder={String(facets.price.min || "Min")} aria-label="Minimum price" className="w-full border border-line bg-card px-3 py-2 text-sm" />
          <span className="text-muted">–</span>
          <input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} onBlur={() => max !== (params.maxPrice ?? "") && push({ maxPrice: max || undefined })} placeholder={String(facets.price.max || "Max")} aria-label="Maximum price" className="w-full border border-line bg-card px-3 py-2 text-sm" />
        </form>
      </div>

      <div>
        <Check on={params.inStock === "true"} onChange={() => push({ inStock: params.inStock === "true" ? undefined : "true" })} count={facets.inStock}>In stock only</Check>
        <Check on={params.onSale === "true"} onChange={() => push({ onSale: params.onSale === "true" ? undefined : "true" })} count={facets.onSale}>On sale</Check>
      </div>

      {facets.brands.length > 0 && (
        <div>
          <p className="eyebrow mb-2">Brand</p>
          {facets.brands.map((b) => <Check key={b.slug} on={brands.includes(b.slug)} onChange={() => toggle("brand", b.slug)} count={b.count}>{b.name}</Check>)}
        </div>
      )}
      {facets.tags.length > 0 && (
        <div>
          <p className="eyebrow mb-2">Features</p>
          {facets.tags.map((t) => <Check key={t.tag} on={tags.includes(t.tag)} onChange={() => toggle("tag", t.tag)} count={t.count}>{label(t.tag)}</Check>)}
        </div>
      )}

      {any && (
        <Link href={params.category ? `/products?category=${params.category}` : "/products"} className="btn btn-ghost w-full !px-4 !py-2.5">Reset filters</Link>
      )}
      {pending && <div aria-hidden className="h-0.5 w-full overflow-hidden bg-line"><div className="h-full w-1/3 animate-[shimmer_1s_linear_infinite] bg-accent" /></div>}
    </div>
  );
}

/** Removable chips for every active filter, shown above the grid. */
export function ActiveFilters({ params, brandNames }: { params: Params; brandNames: Record<string, string> }) {
  const { push, toggle } = useFilterNav(params);
  const chips: { key: string; text: string; off: () => void }[] = [];
  split(params.brand).forEach((b) => chips.push({ key: `b-${b}`, text: brandNames[b] ?? b, off: () => toggle("brand", b) }));
  split(params.tag).forEach((t) => chips.push({ key: `t-${t}`, text: label(t), off: () => toggle("tag", t) }));
  if (params.inStock === "true") chips.push({ key: "stock", text: "In stock", off: () => push({ inStock: undefined }) });
  if (params.onSale === "true") chips.push({ key: "sale", text: "On sale", off: () => push({ onSale: undefined }) });
  if (params.minPrice || params.maxPrice) chips.push({ key: "price", text: `Rs. ${params.minPrice || 0} – ${params.maxPrice || "any"}`, off: () => push({ minPrice: undefined, maxPrice: undefined }) });
  if (!chips.length) return null;
  return (
    <ul className="mb-6 flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <li key={c.key}>
          <button type="button" onClick={c.off} className="flex items-center gap-2 border border-line bg-card px-3 py-1.5 text-xs transition hover:border-accent hover:text-accent" aria-label={`Remove filter ${c.text}`}>
            {c.text}<CloseIcon size={11} />
          </button>
        </li>
      ))}
    </ul>
  );
}
