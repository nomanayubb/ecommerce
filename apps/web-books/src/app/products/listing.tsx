import Link from "next/link";
import type { Metadata } from "next";
import { api, type CategoryNode, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MascotFigure } from "@/components/Mascot";
import { ProductFilters, ActiveFilters, type Facets } from "@/components/ProductFilters";
import { ProductGrid } from "@/components/ProductGrid";
import { FiltersFab } from "@/components/FiltersFab";
import { ProductCard as Card } from "@/components/ProductCard";
import { CardLogo } from "@/components/CardLogo";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export type SP = Record<string, string | undefined>;

export const find = (nodes: CategoryNode[], slug: string, trail: CategoryNode[] = []): CategoryNode[] | null => {
  for (const n of nodes) {
    if (n.slug === slug) return [...trail, n];
    const hit = find(n.children, slug, [...trail, n]);
    if (hit) return hit;
  }
  return null;
};

const holds = (n: CategoryNode, slug?: string): boolean => !!slug && (n.slug === slug || n.children.some((c) => holds(c, slug)));

/** Top menus always; deeper levels only along the branch being viewed, so a big catalogue stays a short list. */
function CategoryList({ nodes, active, depth = 0 }: { nodes: CategoryNode[]; active?: string; depth?: number }) {
  return (
    <ul className={depth ? "ml-3 border-l border-line pl-3" : ""}>
      {nodes.map((n) => (
        <li key={n.id}>
          <Link href={`/collections/${n.slug}`} className={`block py-1.5 text-sm transition hover:text-accent ${active === n.slug ? "font-semibold text-accent" : "text-muted"}`}>
            {n.name}
          </Link>
          {n.children.length > 0 && holds(n, active) && <CategoryList nodes={n.children} active={active} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export async function Listing({ sp, base }: { sp: SP; base: string }) {
  const onColl = base !== "/products";
  const keep = (o: SP) => Object.fromEntries(Object.entries(o).filter(([k, v]) => v && !(onColl && k === "category"))) as Record<string, string>;
  const qs = new URLSearchParams();
  for (const k of ["q", "category", "brand", "tag", "minPrice", "maxPrice", "inStock", "onSale", "minRating", "sort"]) if (sp[k]) qs.set(k, sp[k]!);

  const pageQs = new URLSearchParams(qs);
  if (sp.page) pageQs.set("page", sp.page);
  const [data, tree, facets] = await Promise.all([
    api<{ items: ProductSummary[]; page: number; pageSize: number; total: number }>(`/products?${pageQs}`),
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]),
    api<Facets>(`/products/facets?${qs}`).catch(() => ({ brands: [], tags: [], price: { min: 0, max: 0 }, onSale: 0, inStock: 0 } as Facets)),
  ]);
  const trail = sp.category ? find(tree, sp.category) ?? [] : [];
  const title = sp.q ? `Results for “${sp.q}”` : trail.at(-1)?.name ?? "All products";
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const link = (page: number) => `${base}?${new URLSearchParams({ ...keep(sp), page: String(page) })}`;
  const cat = trail.at(-1);
  const emptyShelf = data.items.length === 0 && onColl && !(sp.minRating || sp.minPrice || sp.maxPrice || sp.inStock || sp.onSale || sp.brand || sp.tag) && !sp.q;
  const popular = data.items.length === 0 && !emptyShelf ? await api<{ items: ProductSummary[] }>("/products?sort=popular&pageSize=4").then((r) => r.items).catch(() => [] as ProductSummary[]) : [];
  const didYouMean = data.items.length === 0 && sp.q ? await api<{ suggestion: string | null }>(`/search/didyoumean?q=${encodeURIComponent(sp.q)}`).then((r) => r.suggestion).catch(() => null) : null;
  const sortHref = (v: string) => { const o = keep({ ...sp, sort: undefined, page: undefined }); return `${base}${Object.keys(o).length || v !== "newest" ? `?${new URLSearchParams({ ...o, ...(v === "newest" ? {} : { sort: v }) })}` : ""}`; };
  const filterActive = !!(sp.minRating || sp.minPrice || sp.maxPrice || sp.inStock || sp.onSale || sp.brand || sp.tag);
  const filters = <ProductFilters params={sp} facets={facets} />;
  const activeCount = (sp.brand ? sp.brand.split(",").length : 0) + (sp.tag ? sp.tag.split(",").length : 0) + (sp.minPrice || sp.maxPrice ? 1 : 0) + (sp.inStock ? 1 : 0) + (sp.onSale ? 1 : 0) + (sp.minRating ? 1 : 0);
  const oneBrand = sp.brand && !sp.brand.includes(",") ? facets.brands.find((b) => b.slug === sp.brand)?.name ?? sp.brand : null;
  const brandNames = Object.fromEntries(facets.brands.map((b) => [b.slug, b.name]));

  return (
    <>
      {onColl && cat && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([
          { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ name: "Home", path: "/" }, { name: "Collections", path: "/collections" }, ...trail.map((c) => ({ name: c.name, path: `/collections/${c.slug}` }))].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE}${c.path}` })) },
          { "@context": "https://schema.org", "@type": "CollectionPage", name: cat.name, description: cat.description ?? undefined, url: `${SITE}/collections/${cat.slug}`, mainEntity: { "@type": "ItemList", numberOfItems: data.total, itemListElement: data.items.slice(0, 24).map((it, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/products/${it.slug}`, name: it.title })) } },
        ]).replace(/</g, "\u003c") }} />
      )}
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop", href: trail.length ? "/products" : undefined }, ...trail.map((c, i) => ({ name: c.name, href: i < trail.length - 1 ? `/collections/${c.slug}` : undefined }))].map((c, i, a) => (i === a.length - 1 ? { name: c.name } : c))} />
      {oneBrand && !cat && !sp.q && (
        <div className="cat-banner mb-8 flex items-center justify-between gap-4 bg-card/60 px-6 py-5"><div><p className="eyebrow">Brand</p><p className="mt-1 text-2xl font-semibold uppercase tracking-[0.15em]">{oneBrand}</p></div><p className="text-sm text-muted">{data.total} {data.total === 1 ? "product" : "products"}</p></div>
      )}
      {cat && !sp.q && (
        <div className="cat-banner relative -mx-4 mb-8 overflow-hidden sm:mx-0">
          <img src={cat.image_url || `/cimg/${cat.slug}?ar=cover`} alt="" width={1600} height={640} fetchPriority="high" className="h-36 w-full object-cover sm:h-48" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          <CardLogo className="bottom-4 right-6 sm:bottom-6 sm:right-10" />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-6 text-ondark sm:px-10"><p className="eyebrow">Collection</p><p className="mt-1 text-2xl font-semibold uppercase tracking-[0.12em] sm:text-3xl">{cat.name}</p></div>
        </div>
      )}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow">Collection</p>
          <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">{title}</h1>
        </div>
        <p className="text-sm text-muted">{data.total} {data.total === 1 ? "product" : "products"}</p>
      </div>
      {cat && !sp.q && cat.description && <p className="-mt-2 mb-6 max-w-3xl text-sm leading-relaxed text-muted">{cat.description}</p>}
      {!sp.q && (() => {
        const on = sp.brand === "averixa";
        const o = keep({ ...sp, brand: on ? undefined : "averixa", page: undefined });
        return <div className="mb-6"><Link href={`${base}${Object.keys(o).length ? `?${new URLSearchParams(o)}` : ""}`} aria-pressed={on} className={`inline-flex items-center gap-2 border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${on ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:border-accent hover:text-accent"}`}><span aria-hidden>{on ? "✓" : "○"}</span>AVERIXA products only</Link></div>;
      })()}

      <FiltersFab count={activeCount} />
      <div className="grid gap-10 lg:grid-cols-[230px_1fr]">
        <aside>
          <details id="filters" className="lg:hidden border border-line bg-card p-4" open={filterActive}>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em]">Filters & sort{activeCount > 0 ? ` (${activeCount})` : ""}</summary>
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

        <section className="min-w-0">
          {cat && cat.children.length > 0 && !sp.q && (
            <div className="mb-5 flex flex-wrap gap-2" aria-label="Sub-categories">
              {cat.children.map((c) => <Link key={c.id} href={`/collections/${c.slug}`} className="border border-line px-3 py-1.5 text-xs uppercase tracking-widest text-muted transition hover:border-accent hover:text-accent">{c.name}</Link>)}
            </div>
          )}
          <div className="mb-5 flex max-w-full gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Sort">
            {([["newest", "Newest"], ["rating", "Top rated"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"], ["discount", "Deals"]] as const).map(([v, l]) => <Link key={v} href={sortHref(v)} className={`shrink-0 border px-3 py-1.5 text-xs uppercase tracking-widest ${(sp.sort ?? "newest") === v ? "border-accent text-accent" : "border-line text-muted"}`}>{l}</Link>)}
          </div>
          <ActiveFilters params={sp} brandNames={brandNames} />
          {data.items.length > 0 ? (
            <ProductGrid key={qs.toString()} initial={data.items} total={data.total} pageSize={data.pageSize} startPage={data.page} qs={qs.toString()} />
          ) : (
            <div className="border border-dashed border-line py-24 text-center">
              <MascotFigure mood="confused" size={96} className="mx-auto mb-4 text-fg" />
              <p className="eyebrow">{emptyShelf ? "Coming soon" : "No results"}</p>
              <p className="mt-3 text-muted">{emptyShelf ? "Products for this collection are on their way." : "Nothing matches those filters."}</p>
              {didYouMean && <p className="mt-3 text-sm">Did you mean <Link href={`/products?q=${encodeURIComponent(didYouMean)}`} className="font-semibold text-accent underline-offset-4 hover:underline">{didYouMean}</Link>?</p>}
              <Link href={emptyShelf ? "/collections" : "/products"} className="btn btn-primary mt-6">{emptyShelf ? "Browse other collections" : "Clear filters"}</Link>
              {popular.length > 0 && <div className="mx-auto mt-12 max-w-3xl text-left"><p className="eyebrow mb-4 text-center">Popular right now</p><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{popular.map((p) => <Card key={p.id} p={p} />)}</div></div>}
            </div>
          )}
          {pages > 1 && (
            <noscript>
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-6 text-xs font-semibold uppercase tracking-[0.2em]">
                {data.page > 1 && <Link href={link(data.page - 1)}>← Previous</Link>}
                <span className="text-muted">Page {data.page} of {pages}</span>
                {data.page < pages && <Link href={link(data.page + 1)}>Next →</Link>}
              </nav>
            </noscript>
          )}
        </section>
      </div>
    </>
  );
}
