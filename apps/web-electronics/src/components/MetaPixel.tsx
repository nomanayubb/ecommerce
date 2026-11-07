"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { PIXEL_ID, px } from "@/lib/pixel";

type W = { fbq?: ((...a: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...a: unknown[]) => void; push?: unknown }; _fbq?: unknown; __pxq?: unknown[][] };

/** Loads the Meta Pixel once the page is idle (so it never slows the first paint) and reports a PageView on every page open and every in-site page change. Rendered only when a Pixel ID is set. */
export function MetaPixel() {
  const path = usePathname();
  useEffect(() => {
    const w = window as unknown as W;
    if (w.fbq) return;
    const f = ((...a: unknown[]) => { if (f.callMethod) f.callMethod(...a); else (f.queue as unknown[]).push(a); }) as NonNullable<W["fbq"]>;
    f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
    w.fbq = f; w._fbq = f;
    f("init", PIXEL_ID);
    for (const a of w.__pxq ?? []) f(...a);
    w.__pxq = [];
    const load = () => { const s = document.createElement("script"); s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js"; document.head.appendChild(s); };
    const later = () => (window.requestIdleCallback ? window.requestIdleCallback(load, { timeout: 4000 }) : setTimeout(load, 1500));
    if (document.readyState === "complete") later(); else window.addEventListener("load", later, { once: true });
  }, []);
  useEffect(() => { px("PageView"); }, [path]);
  return null;
}
