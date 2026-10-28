"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Make = { name: string; slug: string; count: number; models: { name: string; slug: string; count: number }[] };

/** "Select your vehicle": make, then model, then the products page filtered by that vehicle. The list (public/vehicles.json) is only fetched when the visitor first touches a box. */
export function VehicleBar() {
  const router = useRouter();
  const [list, setList] = useState<Make[] | null>(null);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const load = () => { if (!list) fetch("/vehicles.json").then((r) => r.json()).then(setList).catch(() => setList([])); };
  const m = list?.find((x) => x.slug === make);
  const go = () => { const tag = model || make; if (tag) router.push(`/products?tag=${tag}`); };
  const box = "vehicle-select h-10 min-w-0 flex-1 border border-line bg-card px-3 text-sm text-fg outline-none focus:border-accent sm:max-w-[14rem]";
  return (
    <div className="vehicle-bar border-b border-line bg-card/80">
      <div className="mx-auto flex max-w-[var(--maxw)] flex-wrap items-center gap-3 px-4 py-3">
        <span className="vehicle-label text-xs font-bold uppercase tracking-[0.22em] text-accent">Select your vehicle</span>
        <select aria-label="Make" className={box} value={make} onFocus={load} onMouseEnter={load} onChange={(e) => { setMake(e.target.value); setModel(""); }}>
          <option value="">Make</option>
          {(list ?? []).map((x) => <option key={x.slug} value={x.slug}>{x.name} ({x.count})</option>)}
        </select>
        <select aria-label="Model" className={box} value={model} disabled={!m || !m.models.length} onChange={(e) => setModel(e.target.value)}>
          <option value="">{m && !m.models.length ? "All models" : "Model"}</option>
          {(m?.models ?? []).map((x) => <option key={x.slug} value={x.slug}>{x.name} ({x.count})</option>)}
        </select>
        <button type="button" onClick={go} disabled={!make} className="vehicle-go h-10 px-6 text-xs font-bold uppercase tracking-[0.18em] text-white disabled:opacity-50">Find parts</button>
      </div>
    </div>
  );
}
