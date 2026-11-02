import type { Metadata } from "next";
import { api, getSite, type CategoryNode } from "@/lib/api";
import type { PageData } from "@/lib/sections";
import { SectionList } from "@/components/sections";
import { applyPack } from "@/themes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

/** Draft preview of a page from the admin editor, via a short-lived signed link. Never indexed. */
export default async function Preview({ searchParams }: { searchParams: Promise<{ key?: string; t?: string }> }) {
  const { key = "home", t = "" } = await searchParams;
  const q = new URLSearchParams({ key, token: t });
  const [page, categories, site] = await Promise.all([
    api<PageData>(`/templates/preview?${q}`, { revalidate: 0 }).catch(() => null),
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]),
    getSite(),
  ]);
  if (!page) return <p className="py-24 text-center text-muted">This preview link has expired. Open the preview again from the admin.</p>;
  const { branding, pack } = applyPack(site.branding);
  return (
    <>
      <p className="mb-6 border border-accent bg-accent/10 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-accent">Preview of your draft. Not published yet.</p>
      <SectionList sections={page.sections} ctx={{ branding, pack, store: site.store, categories }} />
    </>
  );
}
