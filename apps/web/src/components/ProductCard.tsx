import Link from "next/link";
import { pkr, type ProductSummary } from "@/lib/api";

export function ProductCard({ p }: { p: ProductSummary }) {
  return (
    <Link href={`/products/${p.slug}`} className="group block rounded-lg border border-line bg-card p-3 transition duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden rounded bg-line/40">
        {p.images[0] && <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />}
        {p.discount_pct && <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-0.5 text-xs text-white">-{p.discount_pct}%</span>}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium">{p.title}</h3>
      <p className="text-sm">
        <span className="font-semibold">{pkr(p.selling_price)}</span>{" "}
        {p.discount_pct && <span className="text-muted line-through">{pkr(p.marked_price)}</span>}
      </p>
      {p.stock_quantity === 0 && <p className="text-xs text-red-500">Out of stock</p>}
    </Link>
  );
}
