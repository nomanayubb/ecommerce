"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { pkr } from "@/lib/api";
import { fmtMinutes, fmtQty, type Ingredient, type Recipe, type RecipeProduct } from "@/lib/content";
import { addToList } from "@/lib/shoppingList";
import { mascotSay } from "@/lib/motion";
import { useCart } from "./CartProvider";
import { CookingTimer } from "./CookingTimer";
import { VideoPlayer } from "./PdpExtras";
import { DifficultyBadge } from "./RecipeBits";
import { CheckIcon } from "./icons";

const canAdd = (p: RecipeProduct | null): boolean => !!p && p.stock_quantity > 0 && !p.has_variants && p.moq <= 1;

/** The interactive part of a recipe: servings scaler, ticks, add-to-bag, timers per step, nutrition, equipment. */
export function RecipeView({ r }: { r: Recipe }) {
  const { add } = useCart();
  const [servings, setServings] = useState(r.servings);
  const [have, setHave] = useState<Set<number>>(new Set());
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [listed, setListed] = useState(false);
  const factor = servings / r.servings;

  // Bigger batches take a little longer to prep (not to cook): +15% prep time per extra "base recipe" worth of servings.
  const prep = Math.round(r.prep_minutes * (1 + Math.max(0, factor - 1) * 0.15));
  const est = prep + r.cook_minutes;

  const shopLines = useMemo(() => r.ingredients.filter((i) => i.product), [r.ingredients]);
  const addable = shopLines.filter((i) => canAdd(i.product) && !have.has(r.ingredients.indexOf(i)));

  const nutr = useMemo(() => {
    const withN = r.ingredients.filter((i) => i.nutrition);
    if (!withN.length) return null;
    const sum = withN.reduce((s, i) => ({ kcal: s.kcal + i.nutrition!.kcal, protein: s.protein + i.nutrition!.protein, carbs: s.carbs + i.nutrition!.carbs, fat: s.fat + i.nutrition!.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    const per = (n: number) => Math.round((n / r.servings) * 10) / 10;
    return { kcal: Math.round(sum.kcal / r.servings), protein: per(sum.protein), carbs: per(sum.carbs), fat: per(sum.fat), counted: withN.length, total: r.ingredients.length };
  }, [r]);

  const addProduct = (p: RecipeProduct) => add({ productId: p.id, variantId: null, title: p.title, price: Number(p.selling_price), image: p.image ?? undefined, quantity: 1 });
  const addAll = () => {
    const seen = new Set<string>();
    for (const i of addable) { const p = i.product!; if (seen.has(p.id)) continue; seen.add(p.id); addProduct(p); }
    mascotSay("celebrate", `${seen.size} item${seen.size === 1 ? "" : "s"} added to your bag`);
  };
  const lineText = (i: Ingredient) => `${i.qty != null ? fmtQty(i.qty * factor) : ""}${i.unit ? ` ${i.unit}` : ""} ${i.name}`.trim();

  return (
    <div className="grid gap-12 lg:grid-cols-[380px_1fr]">
      <aside className="space-y-8">
        <div className="border border-line bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DifficultyBadge level={r.difficulty} />
            <p className="text-xs uppercase tracking-widest text-muted" title={`${prep} min prep + ${r.cook_minutes} min cooking at ${servings} servings`}>About {fmtMinutes(est)}</p>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <p className="eyebrow !text-[0.65rem]">Servings</p>
            <div className="flex items-center border border-line" role="group" aria-label="Servings">
              <button className="px-3 py-1.5 transition hover:text-accent" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Fewer servings">−</button>
              <span className="w-10 text-center text-sm" aria-live="polite">{servings}</span>
              <button className="px-3 py-1.5 transition hover:text-accent" onClick={() => setServings((s) => Math.min(48, s + 1))} aria-label="More servings">+</button>
            </div>
          </div>
          {servings !== r.servings && <button className="mt-2 text-xs text-accent underline-offset-4 hover:underline" onClick={() => setServings(r.servings)}>Back to {r.servings} servings</button>}
        </div>

        <section aria-label="Ingredients">
          <h2 className="eyebrow mb-4">Ingredients</h2>
          <ul className="divide-y divide-line">
            {r.ingredients.map((i, n) => (
              <li key={n} className="flex items-start gap-3 py-2.5 text-sm">
                <input type="checkbox" checked={have.has(n)} onChange={() => setHave((s) => { const c = new Set(s); c.has(n) ? c.delete(n) : c.add(n); return c; })} aria-label={`I have ${i.name}`} className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" />
                <span className={`flex-1 ${have.has(n) ? "text-muted line-through" : ""}`}>
                  <span className="font-medium">{i.qty != null ? fmtQty(i.qty * factor) : ""}{i.unit ? ` ${i.unit}` : ""}</span> {i.name}
                  {i.note && <span className="text-muted">, {i.note}</span>}
                  {i.product && (
                    <span className="mt-1 flex items-center gap-2 text-xs">
                      <Link href={`/products/${i.product.slug}`} className="text-accent hover:underline">{i.product.title} · {pkr(i.product.selling_price)}</Link>
                      {canAdd(i.product) ? <button className="border border-line px-2 py-0.5 uppercase tracking-widest transition hover:border-accent hover:text-accent" onClick={() => addProduct(i.product!)}>Add</button> : i.product.stock_quantity === 0 ? <span className="text-muted">Sold out</span> : null}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3">
            {shopLines.length > 0 && <button disabled={!addable.length} onClick={addAll} className="btn btn-primary w-full disabled:opacity-40">Add {addable.length || ""} shop ingredient{addable.length === 1 ? "" : "s"} to bag</button>}
            <button
              onClick={() => { addToList(r.ingredients.filter((i) => !have.has(r.ingredients.indexOf(i))).map((i) => ({ name: i.name, qty: i.qty != null ? Math.round(i.qty * factor * 100) / 100 : null, unit: i.unit, productSlug: i.productSlug })), r.title); setListed(true); mascotSay("happy", "Added to your shopping list"); }}
              className="btn btn-ghost w-full">{listed ? <><CheckIcon size={16} /> On your shopping list</> : "Add to shopping list"}</button>
            {listed && <Link href="/planner#list" className="text-center text-xs text-accent hover:underline">Open shopping list</Link>}
          </div>
        </section>

        {nutr && (
          <section aria-label="Nutrition" className="border border-line bg-card p-5">
            <h2 className="eyebrow mb-3">Per serving (estimate)</h2>
            <p className="text-3xl font-semibold">{nutr.kcal}<span className="ml-1 text-sm font-normal text-muted">kcal</span></p>
            <dl className="mt-4 space-y-2 text-sm">
              {([["Protein", nutr.protein], ["Carbs", nutr.carbs], ["Fat", nutr.fat]] as const).map(([k, v]) => (
                <div key={k}><div className="flex justify-between"><dt className="text-muted">{k}</dt><dd>{v} g</dd></div><div className="mt-1 h-1 bg-line"><div className="h-1 bg-accent" style={{ width: `${Math.min(100, (v / Math.max(nutr.protein, nutr.carbs, nutr.fat, 1)) * 100)}%` }} /></div></div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted">Added up from the {nutr.counted} of {nutr.total} ingredients that list nutrition values. Treat it as a guide.</p>
          </section>
        )}
      </aside>

      <div className="space-y-10">
        {r.video_url && <div className="aspect-video overflow-hidden border border-line"><VideoPlayer url={r.video_url} poster={r.image_url} title={r.title} /></div>}
        <section aria-label="Method">
          <h2 className="eyebrow mb-5">Method</h2>
          <ol className="space-y-6">
            {r.steps.map((s, n) => (
              <li key={n} className="flex gap-4">
                <button onClick={() => setDoneSteps((d) => { const c = new Set(d); c.has(n) ? c.delete(n) : c.add(n); return c; })} aria-pressed={doneSteps.has(n)} aria-label={`Mark step ${n + 1} done`}
                  className={`grid h-8 w-8 shrink-0 place-items-center border text-sm font-semibold transition ${doneSteps.has(n) ? "border-accent bg-accent text-onbrand" : "border-accent text-accent hover:bg-accent/10"}`}>{doneSteps.has(n) ? <CheckIcon size={16} /> : n + 1}</button>
                <div className="flex-1">
                  <p className={`leading-relaxed ${doneSteps.has(n) ? "text-muted line-through" : ""}`}>{s.text}</p>
                  {s.timerMinutes && <div className="mt-3 max-w-sm"><CookingTimer compact minutes={s.timerMinutes} label={`Step ${n + 1} timer`} /></div>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {r.toolProducts.length > 0 && (
          <section aria-label="Equipment">
            <h2 className="eyebrow mb-5">Cooked with</h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {r.toolProducts.map((p) => (
                <li key={p.id} className="border border-line bg-card">
                  <Link href={`/products/${p.slug}`} className="block">
                    <img src={p.image ?? `/ph/${p.slug}`} alt="" loading="lazy" width={300} height={300} className="aspect-square w-full object-cover" />
                    <p className="line-clamp-2 min-h-10 px-3 pt-3 text-sm leading-5">{p.title}</p>
                  </Link>
                  <div className="flex items-center justify-between p-3"><span className="text-sm font-semibold">{pkr(p.selling_price)}</span>
                    {canAdd(p) ? <button className="border border-line px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-widest transition hover:border-accent hover:text-accent" onClick={() => addProduct(p)}>Add</button> : <Link href={`/products/${p.slug}`} className="text-[0.65rem] font-semibold uppercase tracking-widest text-accent">View</Link>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
