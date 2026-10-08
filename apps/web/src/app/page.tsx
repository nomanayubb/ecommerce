import Link from "next/link";
import { api, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { applyPack } from "@/themes";
import { DEFAULT_BRANDING, type Branding } from "@/lib/api";

export default async function Home() {
  const { items } = await api<{ items: ProductSummary[] }>("/products?pageSize=8").catch(() => ({ items: [] }));
  const saved = await api<{ branding: Branding }>("/settings", { revalidate: 30 }).then((r) => r.branding).catch(() => DEFAULT_BRANDING);
  const { branding, pack } = applyPack(saved);
  const grad = pack.decor?.heroGradient;
  return (
    <>
      <section className={`rounded-xl p-10 ${grad ? "text-white" : "bg-brand/10"}`} style={grad ? { background: grad } : undefined}>
        <h1 className="text-3xl font-bold">{branding.tagline || `Welcome to ${branding.name}`}</h1>
        <Link href="/products" className="mt-4 inline-block rounded bg-brand px-5 py-2 text-white">Shop all</Link>
      </section>
      <h2 className="mb-3 mt-8 text-xl font-semibold">New arrivals</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {items.length === 0 && <p className="text-muted">No products yet.</p>}
    </>
  );
}
