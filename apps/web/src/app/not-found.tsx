import Link from "next/link";
import { MascotFigure } from "@/components/Mascot";
import { api, type CategoryNode } from "@/lib/api";

export default async function NotFound() {
  const cats = await api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]);
  return (
    <div className="py-24 text-center">
      <MascotFigure mood="confused" size={120} className="mx-auto mb-4 text-fg" />
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-4 text-4xl font-semibold uppercase tracking-[0.1em]">Page not found</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">The page you are looking for has moved or no longer exists. Try a search or pick a category.</p>
      <form action="/products" role="search" className="mx-auto mt-8 flex max-w-sm">
        <input name="q" placeholder="Search the shop" aria-label="Search the shop" className="min-w-0 flex-1 border border-line bg-card px-4 py-3 text-sm outline-none focus:border-accent" />
        <button className="btn btn-primary !px-5">Search</button>
      </form>
      {cats.length > 0 && <ul className="mt-6 flex flex-wrap justify-center gap-2">{cats.slice(0, 6).map((c) => <li key={c.id}><Link href={`/products?category=${c.slug}`} className="border border-line px-3 py-1.5 text-xs uppercase tracking-widest text-muted transition hover:border-accent hover:text-accent">{c.name}</Link></li>)}</ul>}
      <div className="mt-10 flex justify-center gap-4">
        <Link href="/" className="btn btn-ghost">Home</Link>
        <Link href="/products" className="btn btn-ghost">All products</Link>
      </div>
    </div>
  );
}
