"use client";

import Link from "next/link";
import { useState } from "react";
import { MATERIALS, type Material } from "@/lib/kitchenData";

const LABELS: [keyof Material, string, string][] = [
  ["heatResponse", "Heats up and cools down", "5 = reacts instantly"],
  ["heatRetention", "Holds heat", "5 = stays hot for long"],
  ["weight", "Weight", "5 = very heavy"],
  ["upkeep", "Effort to look after", "5 = needs a lot of care"],
  ["durability", "Lifespan", "5 = lasts for decades"],
  ["price", "Price", "5 = premium"],
];
const YES = { yes: "Yes", no: "No", check: "Depends on the product" } as const;

function Bar({ v }: { v: number }) {
  return <span className="flex items-center gap-1.5" aria-label={`${v} out of 5`}><span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-2 w-4 ${i <= v ? "bg-accent" : "bg-line"}`} />)}</span><span className="text-xs text-muted">{v}/5</span></span>;
}

export default function Materials() {
  const [picked, setPicked] = useState<string[]>(["stainless", "cast-iron"]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? [...p.slice(1), id] : [...p, id]));
  const chosen = MATERIALS.filter((m) => picked.includes(m.id));

  return (
    <>
      <p className="eyebrow"><Link href="/guides" className="hover:text-accent">Guides</Link> / Cookware</p>
      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Compare cookware materials</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">Pick up to three. Scores are a general guide: good and bad examples exist in every material.</p>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Materials">
        {MATERIALS.map((m) => <button key={m.id} aria-pressed={picked.includes(m.id)} onClick={() => toggle(m.id)} className={`border px-3 py-2 text-xs uppercase tracking-widest transition ${picked.includes(m.id) ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-fg"}`}>{m.name}</button>)}
      </div>

      {chosen.length === 0 ? <p className="mt-10 text-muted">Pick a material above.</p> : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead><tr><th className="w-48 border-b border-line p-3" />{chosen.map((m) => <th key={m.id} className="border-b border-line p-3 align-top"><span className="block text-lg font-semibold">{m.name}</span><span className="mt-1 block text-xs font-normal leading-relaxed text-muted">{m.summary}</span></th>)}</tr></thead>
            <tbody>
              {LABELS.map(([k, l, hint]) => (
                <tr key={k}><th scope="row" className="border-b border-line p-3 align-top font-medium">{l}<span className="block text-xs font-normal text-muted">{hint}</span></th>{chosen.map((m) => <td key={m.id} className="border-b border-line p-3"><Bar v={m[k] as number} /></td>)}</tr>
              ))}
              {([["induction", "Works on induction"], ["dishwasher", "Dishwasher safe"], ["ovenSafe", "Oven safe"]] as const).map(([k, l]) => (
                <tr key={k}><th scope="row" className="border-b border-line p-3 font-medium">{l}</th>{chosen.map((m) => <td key={m.id} className="border-b border-line p-3">{YES[m[k]]}</td>)}</tr>
              ))}
              <tr><th scope="row" className="border-b border-line p-3 align-top font-medium">Best for</th>{chosen.map((m) => <td key={m.id} className="border-b border-line p-3 align-top">{m.goodFor}</td>)}</tr>
              <tr><th scope="row" className="p-3 align-top font-medium">Watch out for</th>{chosen.map((m) => <td key={m.id} className="p-3 align-top text-muted">{m.watchOut}</td>)}</tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-8"><Link href="/products" className="btn btn-primary">Shop the range</Link></p>
    </>
  );
}
