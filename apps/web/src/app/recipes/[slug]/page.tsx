import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RecipeCard } from "@/components/RecipeBits";
import { RecipeView } from "@/components/RecipeView";
import { getRecipe } from "@/lib/content";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await getRecipe((await params).slug);
  if (!r) return { title: "Recipe not found" };
  return { title: r.title, description: r.summary || r.title, openGraph: { title: r.title, description: r.summary, images: r.image_url ? [r.image_url] : undefined } };
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const r = await getRecipe((await params).slug);
  if (!r) notFound();
  const iso = (m: number) => `PT${m}M`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Recipe", name: r.title, description: r.summary || undefined, image: r.image_url ? [r.image_url] : undefined,
    prepTime: iso(r.prep_minutes), cookTime: iso(r.cook_minutes), totalTime: iso(r.prep_minutes + r.cook_minutes), recipeYield: `${r.servings} servings`,
    recipeIngredient: r.ingredients.map((i) => `${i.qty ?? ""} ${i.unit} ${i.name}`.replace(/\s+/g, " ").trim()),
    recipeInstructions: r.steps.map((s) => ({ "@type": "HowToStep", text: s.text })),
    keywords: [...r.tags, ...r.seasons].join(", ") || undefined,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Recipes", href: "/recipes" }, { name: r.title }]} />
      <header className="mb-10 grid items-end gap-8 md:grid-cols-2">
        <div>
          <p className="eyebrow">{r.seasons[0] ?? "Recipe"}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-wide">{r.title}</h1>
          {r.summary && <p className="mt-4 max-w-xl text-muted">{r.summary}</p>}
          {r.tags.length > 0 && <ul className="mt-5 flex flex-wrap gap-2">{r.tags.map((t) => <li key={t} className="border border-line px-2.5 py-1 text-[0.65rem] uppercase tracking-widest text-muted">{t}</li>)}</ul>}
        </div>
        <img src={r.image_url || `/ph/${r.slug}`} alt={r.title} width={900} height={600} fetchPriority="high" className="aspect-[3/2] w-full border border-line object-cover" />
      </header>
      <RecipeView r={r} />
      {r.related.length > 0 && (
        <section className="mt-24">
          <p className="eyebrow">Keep cooking</p>
          <h2 className="mb-6 mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">More recipes</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{r.related.map((x) => <RecipeCard key={x.id} r={x} />)}</div>
        </section>
      )}
    </>
  );
}
