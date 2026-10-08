"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { pkr, type ProductDetail } from "@/lib/api";
import { send } from "@/lib/client";
import { fmtMinutes, fmtQty, totalMinutes, type Recipe, type RecipeCardData } from "@/lib/content";
import { addToList, clearList, removeItem, toggleItem, useShoppingList } from "@/lib/shoppingList";
import { mascotSay } from "@/lib/motion";
import { useCart } from "@/components/CartProvider";
import { CloseIcon } from "@/components/icons";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type Plan = Record<string, string[]>;
const PLAN_KEY = "meal-plan";

export default function Planner() {
  const { add } = useCart();
  const list = useShoppingList();
  const [recipes, setRecipes] = useState<RecipeCardData[]>([]);
  const [plan, setPlan] = useState<Plan>({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [prods, setProds] = useState<Record<string, ProductDetail | null>>({});

  useEffect(() => {
    try { setPlan(JSON.parse(localStorage.getItem(PLAN_KEY) ?? "{}")); } catch {}
    setReady(true);
    send<{ items: RecipeCardData[] }>("GET", "recipes?pageSize=48").then((r) => setRecipes(r.items)).catch(() => {});
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); } catch {} }, [plan, ready]);

  // Look up shop products for list items (price + add button).
  const slugs = useMemo(() => [...new Set(list.map((i) => i.productSlug).filter(Boolean) as string[])], [list]);
  useEffect(() => {
    slugs.filter((s) => !(s in prods)).forEach((s) => send<ProductDetail>("GET", `products/${s}`).then((p) => setProds((c) => ({ ...c, [s]: p }))).catch(() => setProds((c) => ({ ...c, [s]: null }))));
  }, [slugs]); // eslint-disable-line react-hooks/exhaustive-deps

  const bySlug = useMemo(() => Object.fromEntries(recipes.map((r) => [r.slug, r])), [recipes]);
  const planned = useMemo(() => [...new Set(Object.values(plan).flat())], [plan]);
  const weekMinutes = Object.values(plan).flat().reduce((s, slug) => s + (bySlug[slug] ? totalMinutes(bySlug[slug]) : 0), 0);

  const addRecipe = (day: string, slug: string) => { if (slug) setPlan((p) => ({ ...p, [day]: [...(p[day] ?? []), slug].slice(0, 3) })); };
  const removeRecipe = (day: string, i: number) => setPlan((p) => ({ ...p, [day]: (p[day] ?? []).filter((_, n) => n !== i) }));

  async function makeList() {
    if (!planned.length) return;
    setBusy(true); setMsg("");
    try {
      const details = await Promise.all(planned.map((s) => send<Recipe>("GET", `recipes/${s}`)));
      for (const r of details) {
        const times = Object.values(plan).flat().filter((s) => s === r.slug).length; // cooked more than once = bigger shop
        addToList(r.ingredients.map((i) => ({ name: i.name, qty: i.qty != null ? Math.round(i.qty * times * 100) / 100 : null, unit: i.unit, productSlug: i.productSlug })), r.title);
      }
      setMsg(`Added ingredients from ${details.length} recipe${details.length === 1 ? "" : "s"} to your shopping list.`);
      mascotSay("happy", "Shopping list ready");
      document.getElementById("list")?.scrollIntoView({ behavior: "smooth" });
    } catch { setMsg("Could not load the recipes. Please try again."); }
    setBusy(false);
  }

  const shopItems = list.filter((i) => i.productSlug && prods[i.productSlug] && !prods[i.productSlug]!.variants.length && prods[i.productSlug]!.stock_quantity > 0 && prods[i.productSlug]!.moq <= 1 && !i.done);
  const addShop = () => {
    for (const i of shopItems) { const p = prods[i.productSlug!]!; add({ productId: p.id, variantId: null, title: p.title, price: Number(p.selling_price), image: p.images[0], quantity: 1 }); }
    mascotSay("celebrate", `${shopItems.length} item${shopItems.length === 1 ? "" : "s"} added to your bag`);
  };

  return (
    <>
      <p className="eyebrow">Kitchen</p>
      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Meal planner</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">Pick up to three recipes a day. Your plan stays in this browser. When you are happy, turn it into one shopping list.</p>

      <div className="mt-8 grid gap-3 md:grid-cols-7">
        {DAYS.map((d) => (
          <section key={d} aria-label={d} className="border border-line bg-card p-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">{d.slice(0, 3)}</h2>
            <ul className="mt-3 space-y-2">
              {(plan[d] ?? []).map((slug, i) => (
                <li key={i} className="flex items-start gap-1 border border-line p-2 text-xs">
                  <Link href={`/recipes/${slug}`} className="flex-1 leading-snug hover:text-accent">{bySlug[slug]?.title ?? slug}<span className="block text-muted">{bySlug[slug] ? fmtMinutes(totalMinutes(bySlug[slug])) : ""}</span></Link>
                  <button aria-label={`Remove from ${d}`} onClick={() => removeRecipe(d, i)} className="p-1 text-muted hover:text-accent"><CloseIcon size={10} /></button>
                </li>
              ))}
            </ul>
            {(plan[d] ?? []).length < 3 && (
              <select aria-label={`Add a recipe on ${d}`} value="" onChange={(e) => addRecipe(d, e.target.value)} className="mt-3 w-full border border-line bg-transparent px-2 py-1.5 text-xs">
                <option value="">+ Add recipe</option>
                {recipes.map((r) => <option key={r.id} value={r.slug}>{r.title}</option>)}
              </select>
            )}
          </section>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button disabled={!planned.length || busy} onClick={makeList} className="btn btn-primary disabled:opacity-40">{busy ? "Building…" : "Make my shopping list"}</button>
        {planned.length > 0 && <p className="text-xs text-muted">{planned.length} recipe{planned.length === 1 ? "" : "s"} · about {fmtMinutes(weekMinutes)} of cooking in total</p>}
        {planned.length > 0 && <button className="text-xs text-muted underline-offset-4 hover:text-accent hover:underline" onClick={() => setPlan({})}>Clear plan</button>}
        {msg && <p role="status" className="text-sm text-accent">{msg}</p>}
      </div>

      <section id="list" className="mt-16 scroll-mt-24 border-t border-line pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow">Shopping list</p><h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">What to buy</h2></div>
          {list.length > 0 && <div className="flex gap-4 text-xs"><button className="text-muted underline-offset-4 hover:text-accent hover:underline" onClick={() => clearList(true)}>Remove ticked</button><button className="text-muted underline-offset-4 hover:text-accent hover:underline" onClick={() => clearList()}>Clear all</button><button className="text-muted underline-offset-4 hover:text-accent hover:underline" onClick={() => window.print()}>Print</button></div>}
        </div>
        {list.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Nothing here yet. Add ingredients from a <Link href="/recipes" className="text-accent hover:underline">recipe</Link>, or build one from your plan above.</p>
        ) : (
          <>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {list.map((i) => {
                const p = i.productSlug ? prods[i.productSlug] : null;
                return (
                  <li key={i.key} className="flex items-center gap-3 py-3 text-sm">
                    <input type="checkbox" checked={i.done} onChange={() => toggleItem(i.key)} aria-label={`Got ${i.name}`} className="h-4 w-4 accent-[rgb(var(--accent))]" />
                    <span className={`flex-1 ${i.done ? "text-muted line-through" : ""}`}>
                      <span className="font-medium">{i.qty != null ? fmtQty(i.qty) : ""}{i.unit ? ` ${i.unit}` : ""}</span> {i.name}
                      <span className="block text-xs text-muted">{i.from.join(", ")}</span>
                    </span>
                    {p && <Link href={`/products/${p.slug}`} className="text-xs text-accent hover:underline">{pkr(p.selling_price)} in shop</Link>}
                    <button aria-label={`Remove ${i.name}`} onClick={() => removeItem(i.key)} className="p-1 text-muted hover:text-accent"><CloseIcon size={12} /></button>
                  </li>
                );
              })}
            </ul>
            {shopItems.length > 0 && <button onClick={addShop} className="btn btn-primary mt-6">Add {shopItems.length} shop item{shopItems.length === 1 ? "" : "s"} to bag</button>}
          </>
        )}
      </section>
    </>
  );
}
