"use client";

import { useEffect, useState } from "react";

type Prefs = { size: number; contrast: boolean; underline: boolean; dyslexia: boolean };
const KEY = "a11y";
const DEFAULT: Prefs = { size: 100, contrast: false, underline: false, dyslexia: false };

/** Applies the saved choices to <html>. The same logic runs before first paint (see layout themeScript) so nothing flashes. */
function apply(p: Prefs) {
  const d = document.documentElement;
  d.style.fontSize = p.size === 100 ? "" : `${p.size}%`;
  d.toggleAttribute("data-contrast", p.contrast);
  d.toggleAttribute("data-underline", p.underline);
  d.toggleAttribute("data-dyslexia", p.dyslexia);
}

/** Footer "Accessibility" menu: text size, high contrast, underlined links, easier-to-read font. Saved on this device. */
export function A11yPanel() {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<Prefs>(DEFAULT);
  useEffect(() => { try { setP({ ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }); } catch {} }, []);
  const set = (patch: Partial<Prefs>) => setP((cur) => { const n = { ...cur, ...patch }; apply(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {} return n; });
  const row = "flex items-center justify-between gap-4 text-sm";
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-xs uppercase tracking-widest text-muted transition hover:text-accent">Accessibility</button>
      {open && (
        <div role="dialog" aria-label="Accessibility options" className="absolute bottom-full left-0 z-50 mb-3 w-72 border border-line bg-card p-4 shadow-2xl">
          <div className={row}><span>Text size</span><span className="flex items-center gap-2">
            <button aria-label="Smaller text" disabled={p.size <= 85} onClick={() => set({ size: p.size - 10 })} className="border border-line px-2.5 py-1 disabled:opacity-40">A−</button>
            <span className="w-10 text-center text-xs text-muted">{p.size}%</span>
            <button aria-label="Larger text" disabled={p.size >= 135} onClick={() => set({ size: p.size + 10 })} className="border border-line px-2.5 py-1 disabled:opacity-40">A+</button></span></div>
          {([["contrast", "High contrast"], ["underline", "Underline links"], ["dyslexia", "Easier-to-read font"]] as const).map(([k, l]) => (
            <label key={k} className={`${row} mt-3 cursor-pointer`}>{l}<input type="checkbox" checked={p[k]} onChange={(e) => set({ [k]: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--accent))]" /></label>
          ))}
          <button className="mt-4 text-xs text-muted underline-offset-4 hover:text-accent hover:underline" onClick={() => set(DEFAULT)}>Reset</button>
        </div>
      )}
    </div>
  );
}
