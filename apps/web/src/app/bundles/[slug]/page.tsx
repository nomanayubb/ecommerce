import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BundleAdd } from "@/components/BundleAdd";
import { getBundle } from "@/lib/content";
import { pkr } from "@/lib/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const b = await getBundle((await params).slug);
  return b ? { title: b.title, description: b.description || b.title } : { title: "Set not found" };
}

export default async function BundlePage({ params }: { params: Promise<{ slug: string }> }) {
  const b = await getBundle((await params).slug);
  if (!b) notFound();
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Curated sets", href: "/bundles" }, { name: b.title }]} />
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="eyebrow">{b.curator ? `Picked by ${b.curator}` : "Curated set"}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-wide">{b.title}</h1>
          {b.description && <p className="mt-4 max-w-xl text-muted">{b.description}</p>}
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {b.items.map((i) => (
              <li key={i.slug} className="flex items-center gap-4 py-4">
                <img src={i.product.image ?? `/ph/${i.slug}`} alt="" width={72} height={72} loading="lazy" className="h-[72px] w-[72px] border border-line object-cover" />
                <Link href={`/products/${i.slug}`} className="flex-1 hover:text-accent"><span className="block font-medium">{i.product.title}</span><span className="text-xs text-muted">{i.qty > 1 ? `${i.qty} × ` : ""}{pkr(i.product.selling_price)}</span></Link>
                <span className="text-sm font-semibold">{pkr(Number(i.product.selling_price) * i.qty)}</span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="h-fit border border-line bg-card p-6 lg:sticky lg:top-24">
          <p className="eyebrow">The set</p>
          <p className="mt-3 text-3xl font-semibold">{pkr(b.total)}</p>
          <p className="mb-6 mt-1 text-xs text-muted">Sum of today&apos;s prices for {b.items.length} products.</p>
          <BundleAdd b={b} />
        </aside>
      </div>
    </>
  );
}
