import Link from "next/link";
import { api, getSite, type CategoryNode, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Motion";
import { ArrowRightIcon } from "@/components/icons";
import { applyPack } from "@/themes";

/** Angular line art echoing the logo's strokes. Decorative only. */
function HeroArt() {
  return (
    <svg aria-hidden viewBox="0 0 600 600" className="pointer-events-none absolute right-0 top-1/2 hidden h-[112%] -translate-y-1/2 opacity-90 lg:block" fill="none" strokeLinecap="square">
      <g className="float-g">
        <g stroke="rgb(var(--accent-bright))" strokeWidth="2">
          <path className="draw" style={{ "--i": 0 } as React.CSSProperties} pathLength={1} d="M120 540 L300 60 L360 60" opacity=".9" />
          <path className="draw" style={{ "--i": 1 } as React.CSSProperties} pathLength={1} d="M200 540 L360 130" opacity=".55" />
          <path className="draw" style={{ "--i": 2 } as React.CSSProperties} pathLength={1} d="M300 340 L520 340 L560 200 L600 200" />
          <path className="draw" style={{ "--i": 3 } as React.CSSProperties} pathLength={1} d="M330 340 L350 420 L520 420 L548 340" opacity=".8" />
        </g>
        <g stroke="rgb(var(--accent-bright))" strokeWidth="2" opacity=".85">
          <circle className="draw" style={{ "--i": 4 } as React.CSSProperties} pathLength={1} cx="380" cy="470" r="16" />
          <circle className="draw" style={{ "--i": 5 } as React.CSSProperties} pathLength={1} cx="490" cy="470" r="16" />
        </g>
      </g>
      <g stroke="rgb(var(--on-dark))" strokeOpacity=".12" strokeWidth="1">
        {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${60 + i * 56} 600 L${300 + i * 30} 0`} />)}
      </g>
    </svg>
  );
}

function SectionHead({ eyebrow, title, href }: { eyebrow: string; title: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div><p className="eyebrow">{eyebrow}</p><h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">{title}</h2></div>
      {href && <Link href={href} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:text-accent">View all <ArrowRightIcon size={16} /></Link>}
    </div>
  );
}

export default async function Home() {
  const [{ items }, categories, site] = await Promise.all([
    api<{ items: ProductSummary[] }>("/products?pageSize=8").catch(() => ({ items: [] as ProductSummary[] })),
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]),
    getSite(),
  ]);
  const { branding, pack } = applyPack(site.branding);
  const packGrad = pack.decor?.heroGradient;
  const grad = packGrad ?? "linear-gradient(120deg, rgb(var(--dark)) 0%, color-mix(in srgb, rgb(var(--dark)) 86%, rgb(var(--accent-bright))) 55%, rgb(var(--dark)) 100%)";

  return (
    <>
      <section className={`${packGrad ? "" : "hero-anim"} fade-up relative -mx-4 overflow-hidden px-6 py-20 text-ondark sm:mx-0 sm:px-14 sm:py-28`} style={{ background: grad }}>
        <div className="hero-glow" aria-hidden />
        <HeroArt />
        <div className="relative max-w-xl">
          <p className="eyebrow">{branding.name}</p>
          <h1 className="mt-5 text-4xl font-semibold uppercase leading-[1.08] tracking-[0.04em] sm:text-6xl">
            {(branding.tagline || "Your world. Our store.").split(" ").map((w, i) => (
              <span key={i} className="kword" style={{ "--i": i } as React.CSSProperties}>{w}&nbsp;</span>
            ))}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ondark/70">
            {branding.heroText || "Considered products, honest prices, delivered to your door. Pay when it arrives."}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/products" className="btn btn-shimmer bg-gold text-darksurface hover:bg-ondark">Shop the collection</Link>
            <Link href="/products?sort=price_asc" className="btn border border-ondark/40 text-ondark hover:border-gold hover:text-gold">Best prices</Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mt-16">
          <Reveal><SectionHead eyebrow="Explore" title="Shop by category" /></Reveal>
          {/* Bento: first tile is large, the rest tile around it */}
          <div className="grid auto-rows-[190px] grid-cols-2 gap-4 md:auto-rows-[210px] md:grid-cols-4">
            {categories.slice(0, 5).map((c, i) => (
              <Reveal key={c.id} delay={i * 90} className={i === 0 ? "col-span-2 row-span-2" : i < 3 ? "md:col-span-2" : ""}>
                <Link href={`/products?category=${c.slug}`} className="lift group relative block h-full overflow-hidden border border-line">
                  <img src={`/ph/${c.slug}?ar=4x3`} alt="" loading="lazy" width={800} height={600} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 p-5 text-ondark">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gold">{String(i + 1).padStart(2, "0")}</p>
                    <p className={`mt-1 font-semibold uppercase tracking-[0.15em] ${i === 0 ? "text-2xl" : "text-lg"}`}>{c.name}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="mt-20">
        <Reveal><SectionHead eyebrow="Just in" title="New arrivals" href="/products" /></Reveal>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 80}><ProductCard p={p} /></Reveal>)}
        </div>
        {items.length === 0 && <p className="text-muted">No products yet.</p>}
      </section>

      <Reveal className="mt-24">
        <section className="glass px-6 py-14 text-center sm:px-16">
          <p className="eyebrow">The {branding.name} promise</p>
          <p className="mx-auto mt-4 max-w-2xl text-xl font-medium leading-relaxed sm:text-2xl">
            {branding.promiseText || "Every order is checked, packed with care and sent with tracking."}
          </p>
        </section>
      </Reveal>
    </>
  );
}
