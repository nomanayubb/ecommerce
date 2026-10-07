import { notFound } from "next/navigation";
import { api, type ProductDetail } from "@/lib/api";
import { BuyPanel } from "@/components/BuyPanel";

export default async function PDP({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await api<ProductDetail>(`/products/${slug}`).catch(() => null);
  if (!p) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    sku: (p as any).sku,
    image: p.images,
    offers: { "@type": "Offer", priceCurrency: "PKR", price: p.selling_price, availability: p.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="space-y-2">
        {p.images.map((src) => <img key={src} src={src} alt={p.title} className="w-full rounded" />)}
      </div>
      <div>
        {p.brand_name && <p className="text-sm text-muted">{p.brand_name}</p>}
        <h1 className="mb-4 text-2xl font-bold">{p.title}</h1>
        <BuyPanel p={p} />
        {p.description && <p className="mt-6 whitespace-pre-line text-sm text-muted">{p.description}</p>}
      </div>
    </div>
  );
}
