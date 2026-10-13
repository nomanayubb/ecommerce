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
        {tree.length === 0 && <p className="text-muted">No collections yet.</p>}
      </div>
    </>
  );
}
