"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductSummary } from "@/lib/api";
import { send } from "@/lib/client";
import { ProductCard } from "./ProductCard";
import { rememberList } from "./BackLink";

/** Product grid with "load more" (also loads by itself when you scroll to the end). Parent re-keys it when filters change. */
export function ProductGrid({ initial, total, pageSize, qs, startPage = 1 }: { initial: ProductSummary[]; total: number; pageSize: number; qs: string; startPage?: number }) {
  const [items, setItems] = useState(initial);
  const [page, setPage] = useState(startPage);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState<2 | 3 | 4>(3);
  useEffect(() => { try { const c = Number(localStorage.getItem("grid-cols")); if (c === 2 || c === 4) setCols(c); } catch {} }, []);
  const pickCols = (c: 2 | 3 | 4) => { setCols(c); try { localStorage.setItem("grid-cols", String(c)); } catch {} };
  useEffect(() => { rememberList(); }, [qs]);
  const more = (startPage - 1) * pageSize + items.length < total;

  const load = async () => {
    if (busy || !more) return;
    setBusy(true);
    setFailed(false);
    try {
      const r = await send<{ items: ProductSummary[] }>("GET", `products?${qs}${qs ? "&" : ""}page=${page + 1}&pageSize=${pageSize}`);
      setItems((cur) => [...cur, ...r.items.filter((n) => !cur.some((c) => c.id === n.id))]);
      setPage((p) => p + 1);
    } catch { setFailed(true); }
    setBusy(false);
  };
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const el = end.current;
    if (!el || !more) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !failed) loadRef.current(); }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [more, failed, items.length]);

  return (
    <>
      <div className="mb-4 hidden items-center justify-end gap-2 text-xs text-muted lg:flex" role="group" aria-label="Products per row">
        <span className="uppercase tracking-widest">View</span>
        {([2, 3, 4] as const).map((c) => <button key={c} type="button" aria-pressed={cols === c} onClick={() => pickCols(c)} className={`h-8 w-8 border transition ${cols === c ? "border-accent text-accent" : "border-line hover:text-fg"}`}>{c}</button>)}
      </div>
      <div className={`grid grid-cols-2 gap-4 ${cols === 2 ? "md:grid-cols-2" : cols === 4 ? "md:grid-cols-3 xl:grid-cols-4" : "md:grid-cols-3"}`}>
        {items.map((p, i) => (
          <div key={p.id} className="fade-up" style={{ animationDelay: `${Math.min(i % pageSize, 8) * 40}ms` }}><ProductCard p={p} priority={i < 2} /></div>
        ))}
      </div>
      <div ref={end} className="mt-10 flex flex-col items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted" aria-live="polite">
        <p>Showing {(startPage - 1) * pageSize + items.length} of {total}</p>
        {more && <button onClick={load} disabled={busy} className="btn btn-ghost">{busy ? "Loading…" : failed ? "Try again" : "Load more"}</button>}
      </div>
    </>
  );
}
