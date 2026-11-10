import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getBundles } from "@/lib/content";
import { pkr } from "@/lib/api";

export const metadata: Metadata = { title: "Curated sets", description: "Hand-picked sets of products that work well together." };

export default async function Bundles() {
  const bundles = await getBundles();
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Curated sets" }]} />
      <p className="eyebrow">Curated</p>
      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Curated sets</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">Products picked to work well together. Add the whole set in one tap.</p>
      {bundles.length === 0 ? <p className="mt-12 border border-dashed border-line py-20 text-center text-muted">No sets yet.</p> : (
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {bundles.map((b) => (
            <li key={b.id}>
              <Link href={`/bundles/${b.slug}`} className="lift block border border-line bg-card">
                <div className="grid grid-cols-4 gap-px bg-line">
                  {b.items.slice(0, 4).map((i) => <img key={i.slug} src={i.product.image ?? `/ph/${i.slug}`} alt="" loading="lazy" width={300} height={300} className="aspect-square w-full object-cover" />)}
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-semibold">{b.title}</h2>
                  {b.curator && <p className="mt-1 text-xs uppercase tracking-widest text-accent">Picked by {b.curator}</p>}
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{b.description}</p>
                  <p className="mt-4 text-sm"><span className="font-semibold">{pkr(b.total)}</span> <span className="text-muted">· {b.items.length} products</span></p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
