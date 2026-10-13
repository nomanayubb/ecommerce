import Link from "next/link";
import type { Metadata } from "next";
import { api, type CategoryNode } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Collections", alternates: { canonical: "/collections" } };

/** All collections at a glance. Each opens at /collections/<address>. */
export default async function Collections() {
  const tree = await api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]);
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Collections" }]} />
      <p className="eyebrow">Browse</p>
      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.12em]">Collections</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {tree.map((c) => (
          <Link key={c.id} href={`/collections/${c.slug}`} className="lift group relative block overflow-hidden border border-line">
            <img src={c.image_url || `/ph/${c.slug}?ar=4x3`} alt="" loading="lazy" width={800} height={600} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-sm font-semibold uppercase tracking-[0.15em] text-white">{c.name}</span>
          </Link>
        ))}
      </div>
      <div className="mt-14 space-y-8">
        {tree.filter((c) => c.children.length > 0).map((c) => (
          <section key={c.id}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em]"><Link href={`/collections/${c.slug}`} className="hover:text-accent">{c.name}</Link></h2>
            <ul className="mt-3 flex flex-wrap gap-2">{c.children.map((k) => <li key={k.id}><Link href={`/collections/${k.slug}`} className="border border-line px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent">{k.name}</Link></li>)}</ul>
          </section>
        ))}
        {tree.length === 0 && <p className="text-muted">No collections yet.</p>}
      </div>
    </>
  );
}
