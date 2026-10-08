import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RecipeCard } from "@/components/RecipeBits";
import { RecipeFinder } from "@/components/RecipeFinder";
import { currentSeason, getRecipes } from "@/lib/content";

export const metadata: Metadata = { title: "Recipes", description: "Recipes with ingredients you can add to your bag in one tap." };
type SP = Record<string, string | undefined>;
const SEASONS = ["spring", "summer", "autumn", "winter", "ramadan", "eid"];

export default async function Recipes({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const k of ["q", "difficulty", "season", "tag", "maxMinutes", "sort", "page"]) if (sp[k]) qs.set(k, sp[k]!);
  qs.set("pageSize", "12");
  const data = await getRecipes(qs.toString());
  const now = currentSeason();
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const link = (over: SP) => { const n = new URLSearchParams(); for (const [k, v] of Object.entries({ ...sp, page: undefined, ...over })) if (v) n.set(k, v); return `/recipes${n.size ? `?${n}` : ""}`; };
  const chip = (active: boolean) => `border px-3 py-1.5 text-xs uppercase tracking-widest transition hover:border-accent hover:text-accent ${active ? "border-accent text-accent" : "border-line text-muted"}`;

  return (
    <>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Recipes" }]} />
      <div className="mb-8 border-b border-line pb-6">
        <p className="eyebrow">Kitchen</p>
        <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Recipes</h1>
        <p className="mt-3 max-w-xl text-sm text-muted">Cook it, then add the ingredients and tools to your bag in one tap. Planning the week? Use the <Link href="/planner" className="text-accent hover:underline">meal planner</Link>.</p>
      </div>

      <RecipeFinder />

      <form action="/recipes" className="mb-6 flex flex-wrap items-end gap-3">
        <input name="q" defaultValue={sp.q} placeholder="Search recipes" aria-label="Search recipes" className="min-w-52 flex-1 border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-accent" />
        <select name="difficulty" defaultValue={sp.difficulty ?? ""} aria-label="Difficulty" className="border border-line bg-card px-3 py-2.5 text-sm"><option value="">Any difficulty</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Advanced</option></select>
        <select name="maxMinutes" defaultValue={sp.maxMinutes ?? ""} aria-label="Time" className="border border-line bg-card px-3 py-2.5 text-sm"><option value="">Any time</option><option value="20">Under 20 min</option><option value="40">Under 40 min</option><option value="60">Under 1 hour</option></select>
        {sp.season && <input type="hidden" name="season" value={sp.season} />}
        <button className="btn btn-primary !py-2.5">Filter</button>
      </form>
      <div className="mb-8 flex flex-wrap gap-2" aria-label="Seasons and occasions">
        <Link href={link({ season: undefined })} className={chip(!sp.season)}>All</Link>
        {SEASONS.map((s) => <Link key={s} href={link({ season: s })} className={chip(sp.season === s)}>{s}{s === now ? " · in season" : ""}</Link>)}
      </div>

      {data.items.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{data.items.map((r) => <RecipeCard key={r.id} r={r} />)}</div>
      ) : (
        <p className="border border-dashed border-line py-20 text-center text-muted">No recipes match yet.</p>
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-6 text-xs font-semibold uppercase tracking-[0.2em]">
          {data.page > 1 ? <Link href={link({ page: String(data.page - 1) })} className="hover:text-accent">← Previous</Link> : <span className="text-muted/40">← Previous</span>}
          <span className="text-muted">Page {data.page} of {pages}</span>
          {data.page < pages ? <Link href={link({ page: String(data.page + 1) })} className="hover:text-accent">Next →</Link> : <span className="text-muted/40">Next →</span>}
        </nav>
      )}
    </>
  );
}
