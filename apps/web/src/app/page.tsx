import Link from "next/link";
import { api, DEFAULT_BRANDING, type Branding, type CategoryNode, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { applyPack } from "@/themes";

/** Angular line art echoing the logo's strokes. Decorative only. */
function HeroArt() {
  return (
    <svg aria-hidden viewBox="0 0 600 600" className="pointer-events-none absolute right-0 top-1/2 hidden h-[112%] -translate-y-1/2 opacity-90 md:block" fill="none" strokeLinecap="square">
      <g stroke="rgb(var(--accent))" strokeWidth="2">
        <path d="M120 540 L300 60 L360 60" opacity=".9" />
        <path d="M200 540 L360 130" opacity=".55" />
        <path d="M300 340 L520 340 L560 200 L600 200" />
        <path d="M330 340 L350 420 L520 420 L548 340" opacity=".8" />
      </g>
      <g stroke="rgb(var(--accent))" strokeWidth="2" opacity=".85">
        <circle cx="380" cy="470" r="16" /><circle cx="490" cy="470" r="16" />
      </g>
      <g stroke="#fff" strokeOpacity=".12" strokeWidth="1">
        {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${60 + i * 56} 600 L${300 + i * 30} 0`} />)}
      </g>
    </svg>
  );
}

export default async function Home() {
  const [{ items }, categories, saved] = await Promise.all([
    api<{ items: ProductSummary[] }>("/products?pageSize=8").catch(() => ({ items: [] as ProductSummary[] })),
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]),
    api<{ branding: Branding }>("/settings", { revalidate: 30 }).then((r) => r.branding).catch(() => DEFAULT_BRANDING),
  ]);
  const { branding, pack } = applyPack(saved);
  const grad = pack.decor?.heroGradient ?? "linear-gradient(120deg,#0b0b0d 0%,#17171a 55%,#2a2318 100%)";

  return (
    <>
      <section className="fade-up relative -mx-4 overflow-hidden px-6 py-20 text-[#f5f0e6] sm:mx-0 sm:px-14 sm:py-28" style={{ background: grad }}>
        <HeroArt />
        <div className="relative max-w-xl">
          <p className="eyebrow">{branding.name}</p>
          <h1 className="mt-5 text-4xl font-semibold uppercase leading-[1.08] tracking-[0.04em] sm:text-6xl">
            {branding.tagline || "Your world. Our store."}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#f5f0e6]/70">
            Considered products, honest prices, delivered to your door across Pakistan. Pay when it arrives.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/products" className="btn bg-[#d4aa46] text-[#121214] hover:bg-[#f5f0e6]">Shop the collection</Link>
            <Link href="/products?sort=price_asc" className="btn border border-[#f5f0e6]/40 text-[#f5f0e6] hover:border-[#d4aa46] hover:text-[#d4aa46]">Best prices</Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between">
            <div><p className="eyebrow">Explore</p><h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">Shop by category</h2></div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {categories.slice(0, 6).map((c, i) => (
              <Link key={c.id} href={`/products?category=${c.slug}`} className="lift group relative block aspect-[4/3] overflow-hidden border border-line">
                <img src={`https://picsum.photos/seed/${c.slug}-cat/800/600`} alt="" loading="lazy" width={800} height={600} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 p-5 text-[#f5f0e6]">
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[#d4aa46]">{String(i + 1).padStart(2, "0")}</p>
                  <p className="mt-1 text-lg font-semibold uppercase tracking-[0.15em]">{c.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-20">
        <div className="mb-6 flex items-end justify-between">
          <div><p className="eyebrow">Just in</p><h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">New arrivals</h2></div>
          <Link href="/products" className="text-xs font-semibold uppercase tracking-[0.2em] hover:text-accent">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {items.length === 0 && <p className="text-muted">No products yet.</p>}
      </section>

      <section className="mt-24 border border-line bg-card px-6 py-14 text-center sm:px-16">
        <p className="eyebrow">The {branding.name} promise</p>
        <p className="mx-auto mt-4 max-w-2xl text-xl font-medium leading-relaxed sm:text-2xl">
          Every order is checked, packed with care and sent with tracking. If it is not right, we make it right.
        </p>
      </section>
    </>
  );
}
