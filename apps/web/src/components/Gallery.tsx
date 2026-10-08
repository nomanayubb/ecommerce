"use client";

import { useEffect, useState } from "react";
import { ArrowRightIcon, CloseIcon } from "./icons";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState(false);
  const list = images.length ? images : [`/ph/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`];
  const go = (d: number) => setI((n) => (n + d + list.length) % list.length);

  // Lightbox: Esc closes, arrows navigate, page scroll locked
  useEffect(() => {
    if (!box) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [box]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid gap-3 sm:grid-cols-[72px_1fr]">
      <div className="order-2 flex gap-3 sm:order-1 sm:flex-col">
        {list.map((src, n) => (
          <button key={src} onClick={() => setI(n)} aria-label={`Show image ${n + 1}`} aria-current={n === i}
            className={`aspect-[4/5] w-16 overflow-hidden border transition sm:w-full ${n === i ? "border-accent" : "border-line opacity-70 hover:opacity-100"}`}>
            <img src={src} alt="" width={72} height={90} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <button
        type="button" aria-label="Open image full screen" onClick={() => setBox(true)}
        className="order-1 relative aspect-[4/5] cursor-zoom-in overflow-hidden border border-line bg-card sm:order-2"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <img src={list[i]} alt={title} width={800} height={1000} fetchPriority="high"
          className="h-full w-full object-cover transition-transform duration-200"
          style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
      </button>

      {box && (
        <div role="dialog" aria-modal="true" aria-label={`${title} images`} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onClick={() => setBox(false)}>
          <button aria-label="Close" onClick={() => setBox(false)} className="absolute right-4 top-4 p-3 text-white transition hover:text-gold"><CloseIcon size={26} /></button>
          {list.length > 1 && <button aria-label="Previous image" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-3 top-1/2 -translate-y-1/2 rotate-180 p-3 text-white transition hover:text-gold"><ArrowRightIcon size={28} /></button>}
          <img src={list[i]} alt={title} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] max-w-[92vw] object-contain" />
          {list.length > 1 && <button aria-label="Next image" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 text-white transition hover:text-gold"><ArrowRightIcon size={28} /></button>}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.25em] text-white/70">{i + 1} / {list.length}</p>
        </div>
      )}
    </div>
  );
}
