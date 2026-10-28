import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, type CategoryNode } from "@/lib/api";
import { Listing, find, type SP } from "@/app/products/listing";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tree = await api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]);
  const c = find(tree, slug)?.at(-1);
  const title = c ? (`${c.name} – Shop Online in Pakistan`.length <= 60 ? `${c.name} – Shop Online in Pakistan` : c.name) : "Collection";
  return { title, description: c?.description ?? undefined, alternates: { canonical: `/collections/${slug}` }, openGraph: { title, description: c?.description ?? undefined, type: "website" } };
}

/** A collection: the product list filtered to one category, at /collections/<address>. */
export default async function Collection({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const tree = await api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]);
  if (!find(tree, slug)) notFound();
  return <Listing sp={{ ...sp, category: slug }} base={`/collections/${slug}`} />;
}
