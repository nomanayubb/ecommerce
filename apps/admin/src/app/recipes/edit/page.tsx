"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { csv, field, lab, lines, slugify } from "@/components/ContentList";

interface Ing { name: string; qty: number | null; unit: string; note: string; productSlug: string | null; pantry: boolean; nutrition: { kcal: number; protein: number; carbs: number; fat: number } | null }
interface Step { text: string; timerMinutes: number | null }
interface Recipe {
  slug: string; title: string; summary: string; imageUrl: string; videoUrl: string; difficulty: "EASY" | "MEDIUM" | "HARD";
  prepMinutes: number; cookMinutes: number; servings: number; seasons: string[]; tags: string[]; tools: string[];
  ingredients: Ing[]; steps: Step[]; featured: boolean; status: "DRAFT" | "PUBLISHED";
}
const BLANK: Recipe = { slug: "", title: "", summary: "", imageUrl: "", videoUrl: "", difficulty: "EASY", prepMinutes: 10, cookMinutes: 20, servings: 4, seasons: [], tags: [], tools: [], ingredients: [], steps: [], featured: false, status: "DRAFT" };

// One ingredient per line:  qty | unit | name | note | product-slug | pantry | kcal/protein/carbs/fat
const ingToLine = (i: Ing) => [i.qty ?? "", i.unit, i.name, i.note, i.productSlug ?? "", i.pantry ? "pantry" : "", i.nutrition ? [i.nutrition.kcal, i.nutrition.protein, i.nutrition.carbs, i.nutrition.fat].join("/") : ""].join(" | ").replace(/( \| )+$/, "");
const lineToIng = (l: string): Ing => {
  const [qty, unit, name, note, slug, pantry, nut] = l.split("|").map((x) => x.trim());
  const n = (nut ?? "").split("/").map(Number);
  return { qty: qty ? Number(qty) : null, unit: unit ?? "", name: name ?? "", note: note ?? "", productSlug: slug || null, pantry: pantry === "pantry", nutrition: n.length === 4 && n.every((x) => Number.isFinite(x)) ? { kcal: n[0], protein: n[1], carbs: n[2], fat: n[3] } : null };
};
const stepToLine = (s: Step) => (s.timerMinutes ? `${s.text} || ${s.timerMinutes}` : s.text);
const lineToStep = (l: string): Step => { const [text, t] = l.split("||").map((x) => x.trim()); return { text, timerMinutes: t ? Number(t) : null }; };

function Editor() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const [r, setR] = useState<Recipe>(BLANK);
  const [t, setT] = useState({ ingredients: "", steps: "", seasons: "", tags: "", tools: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id || id === "new") return;
    api<Recipe>(`/admin/recipes/${id}`).then((x) => {
      setR(x);
      setT({ ingredients: x.ingredients.map(ingToLine).join("\n"), steps: x.steps.map(stepToLine).join("\n"), seasons: x.seasons.join(", "), tags: x.tags.join(", "), tools: x.tools.join(", ") });
    }).catch((e) => setMsg({ ok: false, text: e.message }));
  }, [id]);
  const set = <K extends keyof Recipe>(k: K, v: Recipe[K]) => setR((c) => ({ ...c, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const body = { ...r, slug: r.slug || slugify(r.title), seasons: csv(t.seasons), tags: csv(t.tags), tools: csv(t.tools), ingredients: lines(t.ingredients).map(lineToIng).filter((i) => i.name), steps: lines(t.steps).map(lineToStep).filter((s) => s.text) };
    try {
      if (id === "new") { const res = await api<{ id: string }>("/admin/recipes", { method: "POST", body: JSON.stringify(body) }); router.replace(`/recipes/edit?id=${res.id}`); }
      else await api(`/admin/recipes/${id}`, { method: "PUT", body: JSON.stringify(body) });
      setMsg({ ok: true, text: "Saved." });
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed" }); }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3"><h1 className="mr-auto text-2xl font-bold">{id === "new" ? "New recipe" : "Edit recipe"}</h1><Link href="/recipes" className="text-sm underline">Back</Link><button disabled={busy} className="rounded bg-brand px-6 py-2 text-sm font-medium text-onbrand disabled:opacity-50">{busy ? "Saving..." : "Save"}</button></div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</p>}
      <label className={lab}>Title<input required className={field} value={r.title} onChange={(e) => set("title", e.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={lab}>Page address<input pattern="[a-z0-9-]+" className={field} placeholder="auto from title" value={r.slug} onChange={(e) => set("slug", e.target.value)} /></label>
        <label className={lab}>Difficulty<select className={field} value={r.difficulty} onChange={(e) => set("difficulty", e.target.value as Recipe["difficulty"])}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label>
        <label className={lab}>Status<select className={field} value={r.status} onChange={(e) => set("status", e.target.value as Recipe["status"])}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
      </div>
      <label className={lab}>Short description<textarea rows={2} maxLength={400} className={field} value={r.summary} onChange={(e) => set("summary", e.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={lab}>Photo address<input className={field} value={r.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} /></label>
        <label className={lab}>Video (mp4 / YouTube / Vimeo)<input className={field} value={r.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={lab}>Prep (minutes)<input type="number" min={0} className={field} value={r.prepMinutes} onChange={(e) => set("prepMinutes", Number(e.target.value))} /></label>
        <label className={lab}>Cook (minutes)<input type="number" min={0} className={field} value={r.cookMinutes} onChange={(e) => set("cookMinutes", Number(e.target.value))} /></label>
        <label className={lab}>Serves<input type="number" min={1} className={field} value={r.servings} onChange={(e) => set("servings", Number(e.target.value))} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={lab}>Seasons / occasions, comma separated (e.g. summer, winter, ramadan, eid)<input className={field} value={t.seasons} onChange={(e) => setT({ ...t, seasons: e.target.value })} /></label>
        <label className={lab}>Tags, comma separated (e.g. vegan, quick, dessert)<input className={field} value={t.tags} onChange={(e) => setT({ ...t, tags: e.target.value })} /></label>
      </div>
      <label className={lab}>Equipment: product page addresses, comma separated (shoppers can add these to the bag)<input className={field} placeholder="nova-chef-pan-set, apex-electric-kettle" value={t.tools} onChange={(e) => setT({ ...t, tools: e.target.value })} /></label>
      <label className={lab}>
        Ingredients, one per line: quantity | unit | name | note | product address | pantry | kcal/protein/carbs/fat
        <textarea rows={8} className={`${field} font-mono`} placeholder={"2 | cups | flour | sifted | all-purpose-flour | | 910/26/190/2.4\n1 | tsp | salt | | | pantry"} value={t.ingredients} onChange={(e) => setT({ ...t, ingredients: e.target.value })} />
      </label>
      <p className="-mt-2 text-xs text-muted">Quantity and the nutrition numbers refer to the amount on that line (for the whole recipe). Mark salt, water and oil as <code>pantry</code> so the ingredient finder ignores them.</p>
      <label className={lab}>Steps, one per line. Add <code>|| minutes</code> to give a step a timer (e.g. Simmer gently || 15)<textarea rows={8} className={field} value={t.steps} onChange={(e) => setT({ ...t, steps: e.target.value })} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={r.featured} onChange={(e) => set("featured", e.target.checked)} />Feature this recipe (shown first)</label>
    </form>
  );
}

export default function EditRecipe() {
  return <Suspense fallback={<p className="text-muted">Loading...</p>}><Editor /></Suspense>;
}
