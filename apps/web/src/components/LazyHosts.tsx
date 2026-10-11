"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Effects, Visuals } from "@/lib/api";
import { useCart } from "./CartProvider";
import { useShopper } from "./Shopper";

/**
 * Parts of the page the shopper may never use are loaded on demand, so the first page view ships less JavaScript:
 * the bag drawer (and its animation library) loads on the first open, quick view on the first quick view, and the
 * mascot, effects and confetti load once the browser is idle.
 */
const Drawer = dynamic(() => import("./CartDrawer").then((m) => m.CartDrawer), { ssr: false });
const Quick = dynamic(() => import("./QuickView").then((m) => m.QuickView), { ssr: false });
const Tray = dynamic(() => import("./CompareTray").then((m) => m.CompareTray), { ssr: false });
const Mascot = dynamic(() => import("./Mascot").then((m) => m.MascotAssistant), { ssr: false });
const Confetti = dynamic(() => import("./Confetti").then((m) => m.ConfettiHost), { ssr: false });
const Effects = dynamic(() => import("./Effects").then((m) => m.EffectsHost), { ssr: false });
const Keys = dynamic(() => import("./Shortcuts").then((m) => m.Shortcuts), { ssr: false });
const Pwa = dynamic(() => import("./Pwa").then((m) => m.PwaRegister), { ssr: false });
const Visual = dynamic(() => import("./Visuals").then((m) => m.VisualsHost), { ssr: false });

/** True once the browser has a quiet moment (or after a short delay where requestIdleCallback is missing). */
function useIdle(ms = 1200) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (n: number) => void };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(() => setIdle(true), { timeout: ms * 2 }); return () => w.cancelIdleCallback?.(id); }
    const t = setTimeout(() => setIdle(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return idle;
}

export function LazyDrawer() {
  const { open } = useCart();
  const [seen, setSeen] = useState(false);
  useEffect(() => { if (open) setSeen(true); }, [open]);
  return seen ? <Drawer /> : null;
}
export function LazyQuickView() {
  const { quick } = useShopper();
  const [seen, setSeen] = useState(false);
  useEffect(() => { if (quick) setSeen(true); }, [quick]);
  return seen ? <Quick /> : null;
}
export function LazyCompareTray() {
  const { compare, notice } = useShopper();
  return compare.length || notice ? <Tray /> : null;
}
export function LazyIdleHosts({ effects, brandName, visuals }: { effects?: Partial<Effects>; brandName: string; visuals: Partial<Visuals> }) {
  const idle = useIdle();
  if (!idle) return null;
  // Data-saver / very slow connections: skip the optional extras entirely (only the service worker stays).
  if (document.documentElement.dataset.lite === "1") return <Pwa />;
  return (
    <>
      <Pwa />
      <Keys />
      <Mascot />
      <Confetti />
      <Effects effects={effects} brandName={brandName} />
      <Visual visuals={visuals} />
    </>
  );
}
