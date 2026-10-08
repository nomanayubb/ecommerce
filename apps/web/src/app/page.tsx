import type { Metadata } from "next";
import { api, getSite, type CategoryNode } from "@/lib/api";
import type { PageData } from "@/lib/sections";
import { SectionList } from "@/components/sections";
import { applyPack } from "@/themes";

const load = () => api<PageData>("/templates?key=home").catch(() => null);

export async function generateMetadata(): Promise<Metadata> {
  const p = await load();
  return p?.seo?.title || p?.seo?.description ? { title: p.seo.title || undefined, description: p.seo.description || undefined } : {};
}

/** The home page is a list of sections edited in the admin (Pages > Home). */
export default async function Home() {
  const [page, categories, site] = await Promise.all([
    load(),
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]),
    getSite(),
  ]);
  const { branding, pack } = applyPack(site.branding);
  if (!page) return <p className="py-24 text-center text-muted">The store is taking a short break. Please check back in a moment.</p>;
  return <SectionList sections={page.sections} ctx={{ branding, pack, store: site.store, categories }} />;
}
