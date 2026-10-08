"use client";

import { useState } from "react";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const list = images.length ? images : [`/ph/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`];

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
      <div
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
      </div>
    </div>
  );
}
