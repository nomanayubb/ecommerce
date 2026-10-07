import Link from "next/link";
import { api, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";

type SP = Record<string, string | undefined>;

export default async function Products({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const k of ["q", "category", "brand", "minPrice", "maxPrice", "inStock", "sort", "page"]) if (sp[k]) qs.set(k, sp[k]!);
  const data = await api<{ items: ProductSummary[]; page: number; pageSize: number; total: number }>(`/products?${qs}`);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const link = (page: number) => `/products?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(page) })}`;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{data.total} products</p>
        <form className="flex gap-2 text-sm">
          {sp.q && <input type="hidden" name="q" value={sp.q} />}
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          <select name="sort" defaultValue={sp.sort ?? "newest"} className="rounded border border-line bg-card px-2 py-1">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <label className="flex items-center gap-1"><input type="checkbox" name="inStock" value="true" defaultChecked={sp.inStock === "true"} /> In stock</label>
          <button className="rounded border border-line px-3">Apply</button>
        </form>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {data.items.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {data.items.length === 0 && <p className="text-muted">No products match.</p>}
      {pages > 1 && (
        <nav className="mt-6 flex justify-center gap-2">
          {data.page > 1 && <Link href={link(data.page - 1)} className="rounded border border-line px-3 py-1">Prev</Link>}
          <span className="px-3 py-1 text-sm">Page {data.page} / {pages}</span>
          {data.page < pages && <Link href={link(data.page + 1)} className="rounded border border-line px-3 py-1">Next</Link>}
        </nav>
      )}
    </>
  );
}
