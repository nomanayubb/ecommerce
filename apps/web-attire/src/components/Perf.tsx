"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Two tiny speed helpers: (1) when the pointer rests on an internal link for a moment, that page starts loading
 * so the click feels instant; (2) animations pause while the tab is hidden (saves battery and CPU).
 */
export function Perf() {
  const router = useRouter();
  useEffect(() => {
    const seen = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const over = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href^='/']") as HTMLAnchorElement | null;
      if (timer) { clearTimeout(timer); timer = null; }
      if (!a || a.target || seen.has(a.pathname + a.search) || /^\/(api|account|checkout|login|register|preview)/.test(a.pathname)) return;
      timer = setTimeout(() => { seen.add(a.pathname + a.search); router.prefetch(a.pathname + a.search); }, 90);
    };
    const vis = () => { document.documentElement.toggleAttribute("data-hidden", document.hidden); };
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("pointerover", over); document.removeEventListener("visibilitychange", vis); if (timer) clearTimeout(timer); };
  }, [router]);
  return null;
}
