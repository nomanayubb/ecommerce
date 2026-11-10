import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, getSite, type CategoryNode } from "@/lib/api";
import type { PageData } from "@/lib/sections";
import { SectionList } from "@/components/sections";
import { applyPack } from "@/themes";

const load = (slug: string) => api<PageData>(`/templates?key=${encodeURIComponent(`page:${slug}`)}`).catch(() => null);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) notFound(); // resolved before streaming starts, so crawlers get a real 404 status
  return { title: p.seo.title || p.title, description: p.seo.description || undefined };
}

/** Custom pages built in the admin (About, FAQ, Contact, landing pages…). */
export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [page, categories, site] = await Promise.all([load(slug), api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]), getSite()]);
  if (!page) notFound();
  const { branding, pack } = applyPack(site.branding);
  return <SectionList sections={page.sections} ctx={{ branding, pack, store: site.store, categories }} />;
}
