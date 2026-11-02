"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { send } from "@/lib/client";
import { ProductCard } from "./ProductCard";

type Opt = { label: string; value: string };
const BUDGET: Opt[] = [
  { label: "Under Rs. 3,000", value: "0-3000" }, { label: "Rs. 3,000 to 10,000", value: "3000-10000" },
  { label: "Over Rs. 10,000", value: "10000-" }, { label: "No limit", value: "" },
];
const PRIORITY: Opt[] = [
  { label: "The lowest price", value: "price_asc" }, { label: "Best rated by customers", value: "rating" },
  { label: "Biggest discount", value: "discount" }, { label: "Newest arrivals", value: "newest" },
];
const label = (t: string) => t.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/**
 * A short "find your match" quiz. Every option comes from the live catalogue (categories, feature tags), so it works
 * for any store without editing code; the budget and priority steps are generic.
 */
export function Quiz({ categories, tags }: { categories: { name: string; slug: string }[]; tags: string[] }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<{ category: string; budget: string; priority: string; tags: string[] }>({ category: "", budget: "", priority: "rating", tags: [] });
  const [res, setRes] = useState<{ items: ProductSummary[]; relaxed: boolean; qs: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const steps = [
    { q: "What are you shopping for?", opts: [...categories.map((c) => ({ label: c.name, value: c.slug })), { label: "Surprise me", value: "" }], key: "category" as const },
    { q: "What is your budget?", opts: BUDGET, key: "budget" as const },
    { q: "What matters most?", opts: PRIORITY, key: "priority" as const },
    ...(tags.length ? [{ q: "Anything it must have? (optional, pick any)", opts: tags.map((t) => ({ label: label(t), value: t })), key: "tags" as const }] : []),
  ];
  const cur = steps[step];

  async function finish(final = a) {
    setBusy(true);
    const build = (withTags: boolean, withBudget: boolean) => {
      const q = new URLSearchParams();
      if (final.category) q.set("category", final.category);
      if (withBudget && final.budget) { const [lo, hi] = final.budget.split("-"); if (lo) q.set("minPrice", lo); if (hi) q.set("maxPrice", hi); }
      if (withTags && final.tags.length) q.set("tag", final.tags.join(","));
      q.set("sort", final.priority); q.set("inStock", "true");
      return q.toString();
    };
    let relaxed = false;
    let qs = build(true, true);
    let r = await send<{ items: ProductSummary[] }>("GET", `products?${qs}&pageSize=6`).catch(() => ({ items: [] as ProductSummary[] }));
    if (!r.items.length && final.tags.length) { relaxed = true; qs = build(false, true); r = await send<{ items: ProductSummary[] }>("GET", `products?${qs}&pageSize=6`).catch(() => ({ items: [] as ProductSummary[] })); }
    if (!r.items.length) { relaxed = true; qs = build(false, false); r = await send<{ items: ProductSummary[] }>("GET", `products?${qs}&pageSize=6`).catch(() => ({ items: [] as ProductSummary[] })); }
    setRes({ items: r.items, relaxed, qs });
    setBusy(false);
  }
  const choose = (v: string) => {
    if (cur.key === "tags") return setA((x) => ({ ...x, tags: x.tags.includes(v) ? x.tags.filter((t) => t !== v) : [...x.tags, v] }));
    const next = { ...a, [cur.key]: v };
    setA(next);
    if (step === steps.length - 1) void finish(next); else setStep(step + 1);
  };

  if (res || busy) {
    return (
      <div>
        <h2 className="text-2xl font-semibold uppercase tracking-[0.12em]">{busy ? "Finding your match…" : "Your matches"}</h2>
        {res && (
          <>
            {res.relaxed && <p className="mt-3 text-sm text-muted">Nothing fitted every answer, so we loosened a few. These are the closest.</p>}
            {res.items.length ? <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">{res.items.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <p className="mt-8 text-muted">No products available right now.</p>}
            <div className="mt-8 flex gap-4"><Link href={`/products?${res.qs}`} className="btn btn-primary">See all matches</Link><button className="btn btn-ghost" onClick={() => { setRes(null); setStep(0); setA({ category: "", budget: "", priority: "rating", tags: [] }); }}>Start again</button></div>
          </>
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="mb-8 flex gap-1.5" aria-hidden>{steps.map((_, i) => <span key={i} className={`h-1 flex-1 ${i <= step ? "bg-accent" : "bg-line"}`} />)}</div>
      <p className="eyebrow">Question {step + 1} of {steps.length}</p>
      <h2 className="mt-3 text-2xl font-semibold">{cur.q}</h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-2" role="group" aria-label={cur.q}>
        {cur.opts.map((o) => {
          const on = cur.key === "tags" ? a.tags.includes(o.value) : false;
          return <button key={o.value || o.label} aria-pressed={cur.key === "tags" ? on : undefined} onClick={() => choose(o.value)} className={`lift border p-5 text-left text-sm transition ${on ? "border-accent bg-accent/10 text-accent" : "border-line bg-card hover:border-accent"}`}>{o.label}</button>;
        })}
      </div>
      <div className="mt-8 flex items-center gap-4">
        {step > 0 && <button className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline" onClick={() => setStep(step - 1)}>Back</button>}
        {cur.key === "tags" && <button className="btn btn-primary" onClick={() => void finish()}>{a.tags.length ? "Show my matches" : "Skip, show matches"}</button>}
      </div>
    </div>
  );
}
