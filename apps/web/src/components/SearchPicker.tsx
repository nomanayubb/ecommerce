"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { latinOnly, noNonLatin } from "@/lib/latin";

/** Searchable picker for a long list (the 550+ TCS cities, the 1,000+ areas of a big city). Type to search: starts-with first, then any word, then text inside a word,
 *  then a close spelling (one or two letters wrong), plus short names from `aliases`. An empty box shows `popular` (or the first entries). An optional `extra` row
 *  (for example "My area is not listed") is always offered last. The value is always an exact entry of the list (or the extra value), or empty: the shopper cannot
 *  end up with text that is not in the list. Works by keyboard and by touch. */

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

export function searchList(items: string[], query: string, popular: string[] | undefined, aliases: Record<string, string> | undefined, rank?: string[]): string[] {
  const q = norm(query);
  const az = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
  if (!q) return rank ? [...items].sort(az) : popular ? popular.filter((c) => items.includes(c)) : items.slice(0, 25);
  const qs = squash(q), toks = q.split(" ");
  const alias = aliases?.[q];
  const scored: [number, string][] = [];
  for (const c of items) {
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
  if (rank) {
    // how well it matches comes first (exact or short name, then names that start with what was typed, then a word that starts with it, then text inside a word, then close spellings);
    // inside each of those groups the major cities come first (biggest first) and everything else follows A to Z
    const pos = (c: string) => { const i = rank.indexOf(c); return i < 0 ? 9999 : i; };
    scored.sort((a, b) => Math.min(a[0], 4) - Math.min(b[0], 4) || pos(a[1]) - pos(b[1]) || az(a[1], b[1]));
    return scored.slice(0, 80).map((x) => x[1]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].length - b[1].length || a[1].localeCompare(b[1]));
  return scored.slice(0, 40).map((x) => x[1]);
}

export function SearchPicker({
  items, value, onChange, required, className, placeholder, popular, aliases, rank, extra, invalidMessage, hint, noMatch, name,
}: {
  items: string[]; value: string; onChange: (v: string) => void; required?: boolean; className?: string; placeholder: string;
  popular?: string[]; aliases?: Record<string, string>; rank?: string[]; extra?: { value: string; label: string };
  invalidMessage: string; hint: (count: number, total: number) => string; noMatch: (q: string) => string; name?: string;
}) {
  const labelOf = (v: string) => (extra && v === extra.value ? extra.label : v);
  const [query, setQuery] = useState(labelOf(value));
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const rows = useMemo(() => {
    const r = searchList(items, query, popular, aliases, rank);
    return extra ? [...r, extra.value] : r;
  }, [items, query, popular, aliases, rank, extra]);

  useEffect(() => { setQuery(labelOf(value)); }, [value]);              // a value set from outside (saved address, remembered city)
  useEffect(() => { setHi(0); }, [query]);
  useEffect(() => { inputRef.current?.setCustomValidity(required && !value ? invalidMessage : ""); }, [required, value, invalidMessage]);
  useEffect(() => {
    const out = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, []);
  useEffect(() => { document.getElementById(`${id}-o${hi}`)?.scrollIntoView({ block: "nearest" }); }, [hi, id]);

  const pick = (v: string) => { onChange(v); setQuery(labelOf(v)); setOpen(false); };
  const type = (raw: string) => {
    const v = latinOnly(raw);                                          // English letters only: Urdu and other scripts are dropped
    setQuery(v); setOpen(true);
    if (value && v.toLowerCase() !== labelOf(value).toLowerCase()) onChange("");   // typing again drops the old choice
    const exact = items.find((c) => c.toLowerCase() === v.trim().toLowerCase());
    if (exact) onChange(exact);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && open && rows[hi]) { e.preventDefault(); pick(rows[hi]); }
    else if (e.key === "Escape") setOpen(false);
  };
  const noHits = rows.length === (extra ? 1 : 0);

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef} value={query} onChange={(e) => type(e.target.value)} onBeforeInput={noNonLatin} onFocus={() => setOpen(true)} onKeyDown={key}
        role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && rows[hi] ? `${id}-o${hi}` : undefined}
        required={required} autoComplete="off" autoCapitalize="words" spellCheck={false} enterKeyHint="done" placeholder={placeholder}
        className={`${className ?? ""} !text-base sm:!text-sm`}
      />
      {name && <input type="hidden" name={name} value={value} />}
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-[min(18rem,45vh)] overflow-y-auto overscroll-contain border border-line bg-card shadow-xl">
          {!query.trim() && <li role="presentation" className="px-4 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">{hint(rows.length - (extra ? 1 : 0), items.length)}</li>}
          {noHits && <li role="presentation" className="px-4 py-4 text-sm text-muted">{noMatch(query)}</li>}
          {rows.map((c, i) => (
            <li key={c} id={`${id}-o${i}`} role="option" aria-selected={c === value} onPointerDown={(e) => { e.preventDefault(); pick(c); }} onMouseMove={() => setHi(i)}
              className={`flex min-h-11 cursor-pointer items-center px-4 py-2.5 text-base sm:text-sm ${extra && c === extra.value ? "border-t border-line text-muted italic " : ""}${i === hi ? "bg-accent/15 text-accent" : extra && c === extra.value ? "" : "text-fg"} ${c === value ? "font-semibold" : ""}`}>
              {labelOf(c)}
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">{open ? `${rows.length - (extra ? 1 : 0)} results` : ""}</p>
    </div>
  );
}
