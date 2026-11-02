"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;

/** Registers the service worker (production only, so development caching never gets in the way). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

/** "Install the app" button. Appears only in browsers that offer installation, and disappears once installed. */
export function InstallApp({ className = "" }: { className?: string }) {
  const [can, setCan] = useState(false);
  const [ios, setIos] = useState(false);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); deferred = e as InstallEvent; setCan(true); };
    const done = () => { deferred = null; setCan(false); };
    if (deferred) setCan(true);
    const nav = navigator as Navigator & { standalone?: boolean };
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) && !nav.standalone && !matchMedia("(display-mode: standalone)").matches);
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  if (!can && ios) return <span className={className}><button type="button" onClick={() => setHint((h) => !h)}>Install the app</button>{hint && <span role="status" className="mt-2 block normal-case tracking-normal">Tap the Share button, then "Add to Home Screen".</span>}</span>;
  if (!can) return null;
  return <button type="button" className={className} onClick={async () => { await deferred?.prompt(); await deferred?.userChoice; deferred = null; setCan(false); }}>Install the app</button>;
}
