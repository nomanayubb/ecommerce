"use client";

import Link from "next/link";
import { useState } from "react";
import { TEMPERATURES } from "@/lib/kitchenData";
import { CookingTimer } from "@/components/CookingTimer";

const f = (c: number) => Math.round((c * 9) / 5 + 32);

export default function Temperatures() {
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [q, setQ] = useState("");
  const show = (c: number | [number, number]) => {
    const conv = (n: number) => (unit === "C" ? n : f(n));
    return Array.isArray(c) ? `${conv(c[0])}–${conv(c[1])}°${unit}` : `${conv(c)}°${unit}`;
  };
  const groups = TEMPERATURES.map((g) => ({ ...g, rows: g.rows.filter((r) => r.food.toLowerCase().includes(q.trim().toLowerCase())) })).filter((g) => g.rows.length);

  return (
    <>
      <p className="eyebrow"><Link href="/guides" className="hover:text-accent">Guides</Link> / Temperatures</p>
      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Temperature guide</h1>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="flex" role="group" aria-label="Unit">{(["C", "F"] as const).map((u) => <button key={u} aria-pressed={unit === u} onClick={() => setUnit(u)} className={`border px-4 py-2 text-sm transition ${unit === u ? "border-accent bg-accent/10 text-accent" : "border-line text-muted"}`}>°{u}</button>)}</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (e.g. chicken, fudge)" aria-label="Search the guide" className="min-w-56 flex-1 border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent" />
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.id} aria-label={g.title}>
              <h2 className="eyebrow">{g.title}</h2>
              {g.intro && <p className="mt-2 text-sm text-muted">{g.intro}</p>}
              <dl className="mt-4 divide-y divide-line border-y border-line">
                {g.rows.map((r) => <div key={r.food} className="flex items-baseline justify-between gap-4 py-3"><dt>{r.food}{r.note && <span className="block text-xs text-muted">{r.note}</span>}</dt><dd className="whitespace-nowrap font-semibold text-accent">{show(r.c)}</dd></div>)}
              </dl>
            </section>
          ))}
          {groups.length === 0 && <p className="text-muted">Nothing matches “{q}”.</p>}
        </div>
        <aside className="h-fit space-y-4 lg:sticky lg:top-24"><p className="eyebrow">Kitchen timer</p><CookingTimer minutes={10} /></aside>
      </div>
    </>
  );
}
