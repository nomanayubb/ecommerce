import Link from "next/link";
import type { Metadata } from "next";
import { api, type CategoryNode, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";

type SP = Record<string, string | undefined>;

const find = (nodes: CategoryNode[], slug: string, trail: CategoryNode[] = []): CategoryNode[] | null => {
  for (const n of nodes) {
    if (n.slug === slug) return [...trail, n];
    const hit = find(n.children, slug, [...trail, n]);
    if (hit) return hit;
  }
  return null;
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const tree = await api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => []);
  const cat = sp.category ? find(tree, sp.category)?.at(-1) : null;
  return { title: sp.q ? `Search: ${sp.q}` : cat ? cat.name : "All products" };
}

function CategoryList({ nodes, active, depth = 0 }: { nodes: CategoryNode[]; active?: string; depth?: number }) {
  return (
    <ul className={depth ? "ml-3 border-l border-line pl-3" : ""}>
      {nodes.map((n) => (
        <li key={n.id}>
          <Link href={`/products?category=${n.slug}`} className={`block py-1.5 text-sm transition hover:text-accent ${active === n.slug ? "font-semibold text-accent" : "text-muted"}`}>
            {n.name}
          </Link>
          {n.children.length > 0 && <CategoryList nodes={n.children} active={active} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export default async function Products({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const k of ["q", "category", "minPrice", "maxPrice", "inStock", "sort", "page"]) if (sp[k]) qs.set(k, sp[k]!);

  const [data, tree] = await Promise.all([
    api<{ items: ProductSummary[]; page: number; pageSize: number; total: number }>(`/products?${qs}`),
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]),
  ]);
  const trail = sp.category ? find(tree, sp.category) ?? [] : [];
  const title = sp.q ? `Results for “${sp.q}”` : trail.at(-1)?.name ?? "All products";
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const link = (page: number) => `/products?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>), page: String(page) })}`;
  const filterActive = !!(sp.minPrice || sp.maxPrice || sp.inStock);

  const filters = (
    <form className="space-y-6" action="/products">
      {sp.q && <input type="hidden" name="q" value={sp.q} />}
      {sp.category && <input type="hidden" name="category" value={sp.category} />}
      <div>
        <p className="eyebrow mb-3">Sort</p>
        <select name="sort" defaultValue={sp.sort ?? "newest"} className="w-full border border-line bg-card px-3 py-2 text-sm">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>
      <div>
        <p className="eyebrow mb-3">Price (Rs.)</p>
        <div className="flex items-center gap-2">
          <input name="minPrice" type="number" min={0} placeholder="Min" defaultValue={sp.minPrice} className="w-full border border-line bg-card px-3 py-2 text-sm" />
          <span className="text-muted">–</span>
          <input name="maxPrice" type="number" min={0} placeholder="Max" defaultValue={sp.maxPrice} className="w-full border border-line bg-card px-3 py-2 text-sm" />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" name="inStock" value="true" defaultChecked={sp.inStock === "true"} className="h-4 w-4 accent-[rgb(var(--accent))]" />
        In stock only
      </label>
      <div className="flex gap-3">
        <button className="btn btn-primary flex-1 !px-4 !py-2.5">Apply</button>
        {(filterActive || sp.sort) && <Link href={sp.category ? `/products?category=${sp.category}` : "/products"} className="btn btn-ghost !px-4 !py-2.5">Reset</Link>}
      </div>
    </form>
  );

  return (
    <>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop", href: trail.length ? "/products" : undefined }, ...trail.map((c, i) => ({ name: c.name, href: i < trail.length - 1 ? `/products?category=${c.slug}` : undefined }))].map((c, i, a) => (i === a.length - 1 ? { name: c.name } : c))} />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow">Collection</p>
          <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">{title}</h1>
        </div>
        <p className="text-sm text-muted">{data.total} {data.total === 1 ? "product" : "products"}</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[230px_1fr]">
        <aside>
          <details className="lg:hidden border border-line bg-card p-4" open={filterActive}>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em]">Filters & sort</summary>
            <div className="mt-4">{filters}</div>
          </details>
          <div className="sticky top-24 hidden space-y-8 lg:block">
            <div>
              <p className="eyebrow mb-3">Categories</p>
              <Link href="/products" className={`block py-1.5 text-sm transition hover:text-accent ${!sp.category ? "font-semibold text-accent" : "text-muted"}`}>All products</Link>
              <CategoryList nodes={tree} active={sp.category} />
            </div>
            {filters}
          </div>
        </aside>

        <section>
          {data.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {data.items.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="border border-dashed border-line py-24 text-center">
              <p className="eyebrow">No results</p>
              <p className="mt-3 text-muted">Nothing matches those filters.</p>
              <Link href="/products" className="btn btn-primary mt-6">Clear filters</Link>
            </div>
          )}
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-6 text-xs font-semibold uppercase tracking-[0.2em]">
              {data.page > 1 ? <Link href={link(data.page - 1)} className="hover:text-accent">← Previous</Link> : <span className="text-muted/40">← Previous</span>}
              <span className="text-muted">Page {data.page} of {pages}</span>
              {data.page < pages ? <Link href={link(data.page + 1)} className="hover:text-accent">Next →</Link> : <span className="text-muted/40">Next →</span>}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
