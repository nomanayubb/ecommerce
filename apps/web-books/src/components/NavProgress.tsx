"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motionAllowed } from "@/lib/motion";

/** Thin gold line that creeps across the top while the next page loads. Skipped when the page-transition effect is on. */
export function NavProgress() {
  const path = usePathname();
  const [w, setW] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || !motionAllowed()) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.origin !== location.origin || a.pathname + a.search === location.pathname + location.search) return;
      stop(); setW(8);
      timer.current = setInterval(() => setW((x) => (x < 85 ? x + (90 - x) * 0.12 : x)), 160);
    };
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("click", onClick); stop(); };
  }, []);
  useEffect(() => { stop(); setW((x) => (x > 0 ? 100 : 0)); const t = setTimeout(() => setW(0), 320); return () => clearTimeout(t); }, [path]);

  if (!w) return null;
  return <div aria-hidden className="navbar-progress pointer-events-none fixed inset-x-0 top-0 z-[75] h-[2px]"><div className="h-full bg-accent" style={{ width: `${w}%`, transition: "width .25s ease, opacity .3s", opacity: w >= 100 ? 0 : 1, boxShadow: "0 0 12px rgb(var(--accent-bright) / .7)" }} /></div>;
}
