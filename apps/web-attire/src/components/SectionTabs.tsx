"use client";

import { useEffect, useState } from "react";

/** Sticky tabs under the header that jump to Reviews, Questions and the recipe/related blocks, highlighting where you are. */
export function SectionTabs({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  useEffect(() => {
    const els = tabs.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => { const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (hit) setActive(hit.target.id); }, { rootMargin: "-20% 0px -65% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [tabs]);
  return (
    <nav aria-label="Product sections" className="sticky top-[3.6rem] z-20 -mx-4 mt-16 overflow-x-auto border-y border-line bg-bg/90 px-4 backdrop-blur">
      <ul className="mx-auto flex max-w-[var(--maxw)] gap-8">
        {tabs.map((t) => <li key={t.id}><a href={`#${t.id}`} aria-current={active === t.id ? "true" : undefined} className={`block whitespace-nowrap border-b-2 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition ${active === t.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"}`}>{t.label}</a></li>)}
      </ul>
    </nav>
  );
}
