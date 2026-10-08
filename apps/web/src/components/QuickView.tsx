"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ProductDetail } from "@/lib/api";
import { BuyPanel } from "./BuyPanel";
import { useShopper } from "./Shopper";
import { CloseIcon } from "./icons";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Product quick view: no page change. Fetches full detail on open. */
export function QuickView() {
  const { quick, closeQuick } = useShopper();
  const [p, setP] = useState<ProductDetail | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!quick) return;
    setP(null); setErr("");
    let live = true;
    fetch(`${BASE}/products/${quick.slug}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load product"))))
      .then((d) => live && setP(d)).catch((e) => live && setErr(e.message));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeQuick();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { live = false; document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [quick, closeQuick]);

  return (
    <AnimatePresence>
      {quick && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeQuick} />
          <motion.div
            role="dialog" aria-modal="true" aria-label={`Quick view: ${quick.title}`}
            className="relative grid max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-line bg-bg shadow-2xl md:grid-cols-2"
            initial={{ y: 24, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 24, scale: 0.98 }} transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <button onClick={closeQuick} aria-label="Close quick view" className="absolute right-3 top-3 z-10 p-2 transition hover:text-accent"><CloseIcon size={20} /></button>
            <div className="aspect-[4/5] bg-card md:aspect-auto">
              <img src={p?.images?.[0] ?? quick.image} alt={quick.title} className="h-full w-full object-cover" />
            </div>
            <div className="p-6 sm:p-8">
              {quick.brand && <p className="eyebrow">{quick.brand}</p>}
              <h2 className="mb-5 mt-2 text-2xl font-semibold leading-tight">{quick.title}</h2>
              {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
              {!p && !err && <div className="animate-pulse space-y-3"><div className="h-8 w-1/2 bg-line" /><div className="h-4 w-1/3 bg-line" /><div className="h-24 bg-line" /></div>}
              {p && <>
                <BuyPanel p={p} compact onAdded={closeQuick} />
                <Link href={`/products/${quick.slug}`} onClick={closeQuick} className="mt-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] underline-offset-4 hover:text-accent hover:underline">View full details →</Link>
              </>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
