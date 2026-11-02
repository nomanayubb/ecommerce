"use client";

import Link from "next/link";
import { useShopper } from "./Shopper";
import { CloseIcon, CompareIcon } from "./icons";

/** Floating pill that appears while products are selected for comparison. */
export function CompareTray() {
  const { compare, clearCompare, notice } = useShopper();
  if (!compare.length && !notice) return null;
  return (
    <div className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6" role="status">
      {notice && <p className="glass px-4 py-2 text-xs">{notice}</p>}
      {compare.length > 0 && (
        <div className="glass flex items-center gap-4 px-4 py-2 shadow-2xl">
          <CompareIcon size={18} />
          <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.18em]">{compare.length} to compare</span>
          <Link href="/compare" className="btn btn-primary !px-4 !py-1.5">Compare</Link>
          <button onClick={clearCompare} aria-label="Clear comparison" className="p-1 text-muted transition hover:text-accent"><CloseIcon size={16} /></button>
        </div>
      )}
    </div>
  );
}
