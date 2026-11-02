"use client";

import { useState } from "react";
import type { ProductDetail } from "@/lib/api";
import { toLite, useShopper } from "./Shopper";
import { CompareIcon, HeartIcon } from "./icons";

/** Wishlist heart and compare toggle for the product page. */
export function PdpActions({ p }: { p: ProductDetail }) {
  const s = useShopper();
  const lite = toLite(p);
  const saved = s.inWish(p.slug), compared = s.inCompare(p.slug);
  const btn = "flex items-center gap-2 border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition";
  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" aria-pressed={saved} onClick={() => s.toggleWish(lite)} className={`${btn} ${saved ? "border-accent text-accent" : "border-line text-muted hover:text-fg"}`}><HeartIcon size={16} filled={saved} />{saved ? "Saved" : "Save"}</button>
      <button type="button" aria-pressed={compared} onClick={() => s.toggleCompare(lite)} className={`${btn} ${compared ? "border-accent text-accent" : "border-line text-muted hover:text-fg"}`}><CompareIcon size={16} />{compared ? "In compare" : "Compare"}</button>
    </div>
  );
}

/** "SKU: ABC-123  Copy" for staff and customers quoting a product. */
export function SkuCopy({ sku }: { sku: string }) {
  const [done, setDone] = useState(false);
  return (
    <p className="flex items-center gap-3 py-4 text-xs uppercase tracking-[0.18em] text-muted">
      <span>SKU <span className="text-fg">{sku}</span></span>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(sku); setDone(true); setTimeout(() => setDone(false), 1800); } catch {} }} className="text-accent transition hover:underline">{done ? "Copied" : "Copy"}</button>
    </p>
  );
}
