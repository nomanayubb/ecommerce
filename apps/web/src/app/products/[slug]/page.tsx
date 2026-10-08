import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, type ProductDetail, type ProductSummary } from "@/lib/api";
import { BuyPanel } from "@/components/BuyPanel";
import { Gallery } from "@/components/Gallery";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";

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
  const related = await api<{ items: ProductSummary[] }>("/products?pageSize=5").then((r) => r.items.filter((x) => x.id !== p.id).slice(0, 4)).catch(() => []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    sku: (p as unknown as { sku?: string }).sku,
    image: p.images,
    description: p.description ?? undefined,
    brand: p.brand_name ? { "@type": "Brand", name: p.brand_name } : undefined,
    offers: { "@type": "Offer", priceCurrency: "PKR", price: p.selling_price, availability: p.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  const details: [string, string][] = [
    ["Description", p.description ?? "Details coming soon."],
    ["Delivery & returns", "Orders are packed within 1–2 working days and delivered across Pakistan. Free delivery over Rs. 5,000, otherwise a flat Rs. 250. Cash on delivery is available. If something is not right, contact us within 7 days."],
    ["Payment", "Pay in cash when your order arrives. More payment methods are coming soon."],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop", href: "/products" }, { name: p.title }]} />
      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <Gallery images={p.images} title={p.title} />
        <div className="md:sticky md:top-24 md:self-start">
          {p.brand_name && <p className="eyebrow">{p.brand_name}</p>}
          <h1 className="mb-6 mt-2 text-3xl font-semibold leading-tight tracking-wide">{p.title}</h1>
          <BuyPanel p={p} />
          <div className="mt-8 divide-y divide-line border-y border-line">
            {details.map(([t, body], i) => (
              <details key={t} open={i === 0} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-[0.2em]">
                  {t}<span className="text-accent transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{body}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24 pb-16 md:pb-0">
          <div className="mb-6 flex items-end justify-between">
            <div><p className="eyebrow">Discover</p><h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">You may also like</h2></div>
            <Link href="/products" className="text-xs font-semibold uppercase tracking-[0.2em] hover:text-accent">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </>
  );
}
