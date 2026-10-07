import Link from "next/link";
import { api, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";

export default async function Home() {
  const { items } = await api<{ items: ProductSummary[] }>("/products?pageSize=8").catch(() => ({ items: [] }));
  return (
    <>
      <section className="rounded-xl bg-brand/10 p-10">
        <h1 className="text-3xl font-bold">Welcome to the store</h1>
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
