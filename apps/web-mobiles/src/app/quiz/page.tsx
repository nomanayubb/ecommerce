import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Quiz } from "@/components/Quiz";
import { api, type CategoryNode } from "@/lib/api";

export const metadata: Metadata = { title: "Find your match", description: "A short quiz that picks products for you." };

export default async function QuizPage() {
  const [tree, facets] = await Promise.all([
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[]),
    api<{ tags: { tag: string; count: number }[] }>("/products/facets").catch(() => ({ tags: [] })),
  ]);
  const hide = new Set(["bestseller", "new", "limited", "sale", "recommended"]);
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Find your match" }]} />
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Quiz</p>
        <h1 className="mb-10 mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Find your match</h1>
        <Quiz categories={tree.map((c) => ({ name: c.name, slug: c.slug }))} tags={facets.tags.map((t) => t.tag).filter((t) => !hide.has(t)).slice(0, 8)} />
      </div>
    </>
  );
}
