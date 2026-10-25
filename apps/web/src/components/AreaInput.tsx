"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { latinOnly, noNonLatin } from "@/lib/latin";
import { searchList } from "./SearchPicker";

/** Area, colony or mohalla box: a normal typing box (any area can be written) that finds matches in the city's area list while the shopper types.
 *  Tap or press Enter on a suggestion to fill it in; nothing is forced. Suggestions are English letters only, like the box itself. */
export function AreaInput({
  items, value, onChange, required, className, placeholder, invalid, onBlurExtra, onInvalid,
}: {
  items: string[]; value: string; onChange: (v: string) => void; required?: boolean; className?: string; placeholder: string;
  invalid?: boolean; onBlurExtra?: (e: React.FocusEvent<HTMLInputElement>) => void; onInvalid?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const hits = useMemo(() => {
    const q = value.trim();
    if (!q || items.length === 0) return [];
    const r = searchList(items, q, undefined, undefined, undefined, true).slice(0, 30);
    return r.length === 1 && r[0].toLowerCase() === q.toLowerCase() ? [] : r;       // already exactly this one
  }, [items, value]);

  useEffect(() => { setHi(-1); }, [value]);
  useEffect(() => {
    const out = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, []);
  useEffect(() => { if (hi >= 0) document.getElementById(`${id}-o${hi}`)?.scrollIntoView({ block: "nearest" }); }, [hi, id]);

  const pick = (v: string) => { onChange(v); setOpen(false); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && hits.length) { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp" && hits.length) { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && open && hi >= 0 && hits[hi]) { e.preventDefault(); pick(hits[hi]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        value={value} onChange={(e) => { onChange(latinOnly(e.target.value)); setOpen(true); }} onBeforeInput={noNonLatin} onFocus={() => setOpen(true)}
        onBlur={(e) => { onBlurExtra?.(e); }} onInvalid={onInvalid} onKeyDown={key}
        role="combobox" aria-expanded={open && hits.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && hi >= 0 ? `${id}-o${hi}` : undefined}
        aria-invalid={invalid ? true : undefined} required={required} autoComplete="off" autoCapitalize="words" spellCheck={false} placeholder={placeholder}
        className={`${className ?? ""} !text-base sm:!text-sm`}
      />
      {open && hits.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-[min(16rem,40vh)] overflow-y-auto overscroll-contain border border-line bg-card shadow-xl">
          {hits.map((c, i) => (
            <li key={c} id={`${id}-o${i}`} role="option" aria-selected={i === hi} onPointerDown={(e) => { e.preventDefault(); pick(c); }} onMouseMove={() => setHi(i)}
              className={`flex min-h-11 cursor-pointer items-center px-4 py-2.5 text-base sm:text-sm ${i === hi ? "bg-accent/15 text-accent" : "text-fg"}`}>
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
