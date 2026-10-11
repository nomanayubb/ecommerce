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
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); deferred = e as InstallEvent; setCan(true); };
    const done = () => { deferred = null; setCan(false); };
    if (deferred) setCan(true);
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  if (!can) return null;
  return <button type="button" className={className} onClick={async () => { await deferred?.prompt(); await deferred?.userChoice; deferred = null; setCan(false); }}>Install the app</button>;
}
