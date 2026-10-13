import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, type CategoryNode } from "@/lib/api";
import { Listing, find, type SP } from "@/app/products/listing";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tree = await api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]);
  const c = find(tree, slug)?.at(-1);
  return { title: c ? c.name : "Collection", alternates: { canonical: `/collections/${slug}` } };
}

/** A collection: the product list filtered to one category, at /collections/<address>. */
export default async function Collection({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const tree = await api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]);
  if (!find(tree, slug)) notFound();
  return <Listing sp={{ ...sp, category: slug }} base={`/collections/${slug}`} />;
}
