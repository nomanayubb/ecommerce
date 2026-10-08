"use client";

import { useEffect, useState } from "react";
import { send } from "@/lib/client";
import type { RecipeCardData } from "@/lib/content";
import { CloseIcon } from "./icons";
import { RecipeCard } from "./RecipeBits";
import { useSession } from "./SessionProvider";

/**
 * "What can I cook?": type what is in the kitchen and get recipes ranked by how many ingredients are covered.
 * Signed-in shoppers can also get recipes that use products they already bought.
 */
export function RecipeFinder() {
  const { user } = useSession();
  const [have, setHave] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [items, setItems] = useState<RecipeCardData[] | null>(null);
  const [mine, setMine] = useState<{ ownedCount: number; items: RecipeCardData[] } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!have.length) { setItems(null); return; }
    let live = true;
    setBusy(true);
    const t = setTimeout(() => {
      send<{ items: RecipeCardData[] }>("GET", `recipes?have=${encodeURIComponent(have.join(","))}&pageSize=12`).then((r) => live && setItems(r.items)).catch(() => live && setItems([])).finally(() => live && setBusy(false));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [have]);

  const add = (raw: string) => {
    const words = raw.split(",").map((w) => w.trim().toLowerCase()).filter((w) => w.length > 1 && !have.includes(w));
    if (words.length) setHave((h) => [...h, ...words].slice(0, 20));
    setDraft("");
  };

  return (
    <section aria-label="Recipe finder" className="mb-12 border border-line bg-card p-6">
      <p className="eyebrow">What can I cook?</p>
      <p className="mt-2 max-w-xl text-sm text-muted">List what you have at home (press Enter after each one). We show recipes you can make, best match first.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {have.map((h) => <button key={h} onClick={() => setHave(have.filter((x) => x !== h))} className="flex items-center gap-1.5 border border-accent px-3 py-1 text-xs text-accent" aria-label={`Remove ${h}`}>{h}<CloseIcon size={10} /></button>)}
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); } if (e.key === "Backspace" && !draft) setHave((h) => h.slice(0, -1)); }} onBlur={() => draft && add(draft)}
          placeholder={have.length ? "Add another…" : "e.g. spaghetti, lemon, garlic"} aria-label="Ingredient you have" className="min-w-48 flex-1 border-b border-line bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted focus:border-accent" />
      </div>
      {user && !mine && <button className="mt-4 text-xs text-accent underline-offset-4 hover:underline" onClick={() => send<{ ownedCount: number; items: RecipeCardData[] }>("GET", "kitchen/recipes").then(setMine).catch(() => setMine({ ownedCount: 0, items: [] }))}>Or: recipes that use products I already bought</button>}
      {busy && <p className="mt-4 text-xs uppercase tracking-widest text-muted">Looking…</p>}
      {items && !busy && (items.length ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">{items.map((r) => <RecipeCard key={r.id} r={r} />)}</div>
      ) : <p className="mt-6 text-sm text-muted">No recipe matches those yet. Try adding another ingredient or a more common word.</p>)}
      {mine && (
        <div className="mt-8 border-t border-line pt-6">
          <p className="eyebrow !text-[0.65rem]">From your kitchen</p>
          {mine.items.length ? <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">{mine.items.map((r) => <RecipeCard key={r.id} r={r} />)}</div>
            : <p className="mt-3 text-sm text-muted">{mine.ownedCount ? "None of our recipes use what you bought yet." : "Once you have placed an order, recipes using your products appear here."}</p>}
        </div>
      )}
    </section>
  );
}
