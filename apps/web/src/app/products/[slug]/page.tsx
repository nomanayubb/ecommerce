import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, getSite, pkr, type ProductDetail, type ProductSummary } from "@/lib/api";
import { BuyPanel } from "@/components/BuyPanel";
import { Gallery } from "@/components/Gallery";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { Reviews } from "@/components/Reviews";
import { Stars } from "@/components/Stars";
import { RecentlyViewed, RecordView } from "@/components/RecentlyViewed";
import { CareSteps, LiveViewers, ProductQA, SpecsTable, type Meta } from "@/components/PdpExtras";
import { CookingTimer } from "@/components/CookingTimer";
import { RecipeCard } from "@/components/RecipeBits";
import type { RecipeCardData } from "@/lib/content";

const load = (slug: string) => api<ProductDetail>(`/products/${slug}`).catch(() => null);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Product not found" };
  const desc = (p.description ?? p.title).slice(0, 160);
  return { title: p.title, description: desc, openGraph: { title: p.title, description: desc, images: p.images.slice(0, 1) } };
}

export default async function PDP({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const { store } = await getSite();
  const related = await api<{ items: ProductSummary[] }>(`/products/${slug}/related`).then((r) => r.items).catch(() => []);
  const recipes = await api<{ items: RecipeCardData[] }>(`/products/${slug}/recipes`).then((r) => r.items).catch(() => [] as RecipeCardData[]);

  const meta = (p.metafields ?? {}) as Meta;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    sku: (p as unknown as { sku?: string }).sku,
    image: p.images,
    description: p.description ?? undefined,
    brand: p.brand_name ? { "@type": "Brand", name: p.brand_name } : undefined,
    aggregateRating: p.rating_count ? { "@type": "AggregateRating", ratingValue: p.rating_avg, reviewCount: p.rating_count } : undefined,
    offers: { "@type": "Offer", priceCurrency: "PKR", price: p.selling_price, availability: p.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  const details: [string, string][] = [
    ["Description", p.description ?? "Details coming soon."],
    ["Delivery & returns", `Orders are packed within 1–2 working days. Free delivery over ${pkr(store.freeShippingThreshold)}, otherwise a flat ${pkr(store.shippingFee)}. Cash on delivery is available. If something is not right, contact us within 7 days.`],
    ["Payment", "Pay in cash when your order arrives. More payment methods are coming soon."],
  ];
  // Optional rich sections, shown only when the shop filled them in (admin > Products > edit).
  const rich: [string, React.ReactNode][] = [];
  if (meta.specs?.length) rich.push(["Specifications", <SpecsTable key="s" specs={meta.specs} />]);
  if (meta.material) rich.push([`Material: ${meta.material}`, <p key="m" className="text-sm leading-relaxed text-muted">{meta.materialNote || `Made from ${meta.material.toLowerCase()}.`}</p>]);
  if (meta.care?.length) rich.push(["Care & maintenance", <CareSteps key="c" steps={meta.care} />]);
  const cookable = recipes.length > 0 || (p.tags ?? []).some((t) => ["oven-safe", "induction", "microwave-safe", "cookware"].includes(t));
  if (cookable) rich.push(["Cooking timer", <CookingTimer key="t" compact minutes={10} />]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <RecordView p={{ id: p.id, slug, title: p.title, price: Number(p.selling_price), marked: Number(p.marked_price), image: p.images[0], brand: p.brand_name }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop", href: "/products" }, { name: p.title }]} />
      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <Gallery images={p.images} title={p.title} videoUrl={meta.videoUrl || undefined} spinImages={meta.spinImages} modelUrl={p.model_3d_url || undefined} />
        <div className="md:sticky md:top-24 md:self-start">
          {p.brand_name && <p className="eyebrow">{p.brand_name}</p>}
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-wide">{p.title}</h1>
          <div className="mb-6 mt-3 h-5">{!!p.rating_count && <a href="#reviews" className="inline-block" aria-label="Read reviews"><Stars value={Number(p.rating_avg)} size={16} count={p.rating_count} /></a>}</div>
          <BuyPanel p={p} />
          <div className="mt-4"><LiveViewers slug={slug} /></div>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {details.map(([t, body], i) => (
              <details key={t} open={i === 0} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-[0.2em]">
                  {t}<span className="text-accent transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{body}</p>
              </details>
            ))}
            {rich.map(([t, node]) => (
              <details key={t} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-[0.2em]">
                  {t}<span className="text-accent transition group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3">{node}</div>
              </details>
            ))}
          </div>
        </div>
      </div>

      <Reviews slug={slug} />
      <ProductQA slug={slug} />

      {recipes.length > 0 && (
        <section className="mt-20 border-t border-line pt-12">
          <p className="eyebrow">Kitchen</p>
          <h2 className="mb-6 mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">Cooked with this</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{recipes.slice(0, 4).map((r) => <RecipeCard key={r.id} r={r} />)}</div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-24 pb-16 md:pb-0">
          <div className="mb-6 flex items-end justify-between">
            <div><p className="eyebrow">Complete the look</p><h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">You may also like</h2></div>
            <Link href="/products" className="text-xs font-semibold uppercase tracking-[0.2em] hover:text-accent">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
      <RecentlyViewed exclude={slug} />
    </>
  );
}
