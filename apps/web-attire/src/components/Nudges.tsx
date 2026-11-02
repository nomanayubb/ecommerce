"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { mascotSay } from "@/lib/motion";
import { useCart } from "./CartProvider";
import { useSession } from "./SessionProvider";

/** Thin bar while the connection is down. */
export function OfflineBanner() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const set = () => setOff(!navigator.onLine);
    set();
    addEventListener("online", set); addEventListener("offline", set);
    return () => { removeEventListener("online", set); removeEventListener("offline", set); };
  }, []);
  if (!off) return null;
  return <div role="status" className="fixed inset-x-0 bottom-0 z-[85] bg-darksurface px-4 py-2 text-center text-xs uppercase tracking-[0.2em] text-gold">You are offline. Pages you opened recently still work.</div>;
}

/** Friendly one-time-per-visit messages from the mascot: welcome back, and "you left something in your bag". */
export function Nudges() {
  const { lines } = useCart();
  const { user, ready } = useSession();
  const path = usePathname();
  useEffect(() => {
    if (!ready) return;
    const seen = (k: string) => { try { if (sessionStorage.getItem(k)) return true; sessionStorage.setItem(k, "1"); } catch {} return false; };
    let delay = 2600;
    if (user?.firstName && !seen("welcomed")) { setTimeout(() => mascotSay("happy", `Welcome back, ${user.firstName}!`), delay); delay += 6500; }
    const n = lines.reduce((s, l) => s + l.quantity, 0);
    if (n > 0 && !/^\/(checkout|login|register)/.test(path) && !seen("bag-reminded")) setTimeout(() => mascotSay("wave", `You left ${n} item${n === 1 ? "" : "s"} in your bag. Ready to check out?`), delay);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
