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
      <section
        className="relative overflow-hidden rounded-xl p-8 text-white sm:p-14"
        style={{ background: grad ?? "linear-gradient(135deg, rgb(var(--hero-a)), rgb(var(--hero-b)))" }}
      >
        <div className="relative z-10 max-w-xl">
          {branding.tagline && <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">{branding.tagline}</p>}
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">Welcome to {branding.name}</h1>
          <p className="mt-3 text-white/70">Free delivery over Rs. 5,000 · Cash on delivery across Pakistan</p>
          <div className="mt-6 flex gap-3">
            <Link href="/products" className="rounded bg-accent px-6 py-3 font-semibold text-black transition hover:brightness-110">Shop now</Link>
            <Link href="/products?sort=price_asc" className="rounded border border-white/30 px-6 py-3 transition hover:bg-white/10">Best prices</Link>
          </div>
        </div>
        {branding.logoUrl && (
          <img src={branding.logoUrl} alt="" aria-hidden className="pointer-events-none absolute right-8 top-1/2 hidden w-[40%] -translate-y-1/2 opacity-95 drop-shadow-[0_0_60px_rgba(201,151,43,0.35)] md:block" />
        )}
      </section>
      <h2 className="mb-3 mt-8 text-xl font-semibold">New arrivals</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {items.length === 0 && <p className="text-muted">No products yet.</p>}
    </>
  );
}
