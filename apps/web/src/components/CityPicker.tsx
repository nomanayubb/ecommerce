"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

/** Searchable city picker for a long list (the 550+ TCS cities). Type to search: starts-with first, then any word, then text inside a word,
 *  then a close spelling (one or two letters wrong), plus short names people use ("pindi", "khi", "dg khan"). Empty box shows the big cities.
 *  The shopper can only end up with a city from the list (the form value is the exact TCS spelling, or empty). Works by keyboard and by touch. */

const POPULAR = ["KARACHI", "LAHORE", "ISLAMABAD", "RAWALPINDI", "FAISALABAD", "MULTAN", "PESHAWAR", "QUETTA", "HYDERABAD", "GUJRANWALA", "SIALKOT", "SARGODAH"];
const ALIASES: Record<string, string> = {
  khi: "KARACHI", lhr: "LAHORE", isb: "ISLAMABAD", pindi: "RAWALPINDI", rwp: "RAWALPINDI", fsd: "FAISALABAD", lyallpur: "FAISALABAD", mtn: "MULTAN", pwr: "PESHAWAR",
  hyd: "HYDERABAD", sargodha: "SARGODAH", gwadar: "GAWADAR", ryk: "RAHIMYARKHAN", "rahim yar khan": "RAHIMYARKHAN", "dg khan": "DERA GHAZI KHAN", dgk: "DERA GHAZI KHAN",
  "di khan": "DERA ISMAIL KHAN", dik: "DERA ISMAIL KHAN", muzaffarabad: "MUZAFFARABAD AK", kotli: "KOTLI-A.KASHMIR", abbottabad: "ABBOTABAD", nowshera: "NOWSHERA", swat: "SWAT",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const squash = (s: string) => s.replace(/ /g, "");

/** Edit distance where swapping two neighbouring letters counts as one mistake. */
function dl(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}

function search(cities: string[], query: string): string[] {
  const q = norm(query);
  if (!q) return POPULAR.filter((c) => cities.includes(c));
  const qs = squash(q), toks = q.split(" ");
  const alias = ALIASES[q];
  const scored: [number, string][] = [];
  for (const c of cities) {
    const cn = norm(c), cs = squash(cn), words = cn.split(" ");
    let s = 99;
    if (alias === c) s = 0;
    else if (cn === q || cs === qs) s = 0;
    else if (cn.startsWith(q) || cs.startsWith(qs)) s = 1;
    else if (toks.every((t) => words.some((w) => w.startsWith(t)))) s = 2;
    else if (cs.includes(qs)) s = 3;
    else if (qs.length >= 4) {
      const tol = qs.length >= 7 ? 2 : 1;
      const close = Math.min(dl(qs, cs.slice(0, qs.length)), dl(qs, cs.slice(0, qs.length + 1)), ...words.filter((w) => w.length >= 4).map((w) => dl(qs, w)));
      if (close <= tol) s = 4 + close;
    }
    if (s < 99) scored.push([s, c]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].length - b[1].length || a[1].localeCompare(b[1]));
  return scored.slice(0, 40).map((x) => x[1]);
}

export function CityPicker({ cities, value, onChange, required, className }: { cities: string[]; value: string; onChange: (city: string) => void; required?: boolean; className?: string }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const results = useMemo(() => search(cities, query), [cities, query]);

  useEffect(() => { setQuery(value); }, [value]);                       // a saved address or remembered city arrives from outside
  useEffect(() => { setHi(0); }, [query]);
  useEffect(() => { inputRef.current?.setCustomValidity(required && !value ? "Please choose your city from the list" : ""); }, [required, value]);
  useEffect(() => {
    const out = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, []);
  useEffect(() => { document.getElementById(`${id}-o${hi}`)?.scrollIntoView({ block: "nearest" }); }, [hi, id]);

  const pick = (c: string) => { onChange(c); setQuery(c); setOpen(false); };
  const type = (v: string) => {
    setQuery(v); setOpen(true);
    if (value && v.toLowerCase() !== value.toLowerCase()) onChange("");   // typing again drops the old choice
    const exact = cities.find((c) => c.toLowerCase() === v.trim().toLowerCase());
    if (exact) onChange(exact);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && open && results[hi]) { e.preventDefault(); pick(results[hi]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef} value={query} onChange={(e) => type(e.target.value)} onFocus={() => setOpen(true)} onKeyDown={key}
        role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && results[hi] ? `${id}-o${hi}` : undefined}
        required={required} autoComplete="off" autoCapitalize="words" spellCheck={false} enterKeyHint="done" placeholder="Type to search your city"
        className={`${className ?? ""} !text-base sm:!text-sm`}
      />
      <input type="hidden" name="city" value={value} />
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-[min(18rem,45vh)] overflow-y-auto overscroll-contain border border-line bg-card shadow-xl">
          {!query.trim() && <li role="presentation" className="px-4 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">Popular cities, or type to search all {cities.length}</li>}
          {results.length === 0 && <li role="presentation" className="px-4 py-4 text-sm text-muted">No city matches “{query}”. Check the spelling or try a nearby big city.</li>}
          {results.map((c, i) => (
            <li key={c} id={`${id}-o${i}`} role="option" aria-selected={c === value} onPointerDown={(e) => { e.preventDefault(); pick(c); }} onMouseMove={() => setHi(i)}
              className={`flex min-h-11 cursor-pointer items-center px-4 py-2.5 text-base sm:text-sm ${i === hi ? "bg-accent/15 text-accent" : "text-fg"} ${c === value ? "font-semibold" : ""}`}>
              {c}
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">{open ? `${results.length} cities` : ""}</p>
    </div>
  );
}
