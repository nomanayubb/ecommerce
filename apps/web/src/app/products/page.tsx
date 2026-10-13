import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { api, type CategoryNode } from "@/lib/api";
import { Listing, find, type SP } from "./listing";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const tree = await api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => []);
  const cat = sp.category ? find(tree, sp.category)?.at(-1) : null;
  return { title: sp.q ? `Search: ${sp.q}` : cat ? cat.name : "All products", alternates: { canonical: sp.category && !sp.q ? `/collections/${sp.category}` : "/products" } };
}

/** Old links like /products?category=kitchen go to the collection address. */
export default async function Products({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  if (sp.category && !sp.q) {
    const rest = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "category") as [string, string][]);
    redirect(`/collections/${encodeURIComponent(sp.category)}${rest.size ? `?${rest}` : ""}`);
  }
  return <Listing sp={sp} base="/products" />;
}

