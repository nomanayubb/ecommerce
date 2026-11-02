"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motionAllowed } from "@/lib/motion";

export interface Slide { id: string; eyebrow?: string; heading?: string; text?: string; buttonLabel?: string; buttonHref?: string; imageUrl?: string; art?: string }

/** Extra picture and text for one slide. Same frame, spacing and overlay as the home cover, so every slide sits exactly where the cover sits. */
function SlideFrame({ s }: { s: Slide }) {
  const art = s.art || "sparkle";
  return (
    <section className="relative -mx-4 overflow-hidden px-6 pb-14 text-ondark sm:mx-0 sm:px-14 sm:py-28" style={{ background: "rgb(var(--dark))" }}>
      <div className="relative -mx-6 aspect-[16/10] overflow-hidden sm:absolute sm:inset-0 sm:mx-0 sm:aspect-auto">
        <img src={s.imageUrl || `/cimg/slide-${art}?ar=cover&f=${art}`} alt="" loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--dark))] via-[rgb(var(--dark))]/30 to-transparent sm:bg-gradient-to-r sm:from-black/75 sm:via-black/40 sm:to-transparent" />
      </div>
      <div className="relative -mt-6 sm:mt-0">
        <div className="relative max-w-xl">
          {s.eyebrow && <p className="eyebrow">{s.eyebrow}</p>}
          {s.heading && <h2 className="mt-5 text-3xl font-semibold uppercase leading-[1.1] tracking-[0.05em] sm:text-5xl">{s.heading}</h2>}
          {s.text && <p className="mt-5 max-w-md text-base leading-relaxed text-ondark/70">{s.text}</p>}
          {s.buttonLabel && s.buttonHref && <div className="mt-8"><Link href={s.buttonHref} className="btn btn-shimmer bg-gold text-darksurface hover:bg-ondark">{s.buttonLabel}</Link></div>}
        </div>
      </div>
    </section>
  );
}

/**
 * The home cover stays exactly as it is as the first slide; more slides follow it. All slides share one grid cell, so the height
 * never jumps. Changes by itself (when motion is allowed), with arrows, dots, swipe, and a pause while the pointer is on it.
 */
export function HeroSlideshow({ first, slides, seconds = 6 }: { first: ReactNode; slides: Slide[]; seconds?: number }) {
  const total = slides.length + 1;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef(0);
  const go = useCallback((d: number) => setI((n) => (n + d + total) % total), [total]);

  useEffect(() => {
    if (paused || total < 2 || !motionAllowed()) return;
    const t = setInterval(() => { if (!document.hidden) go(1); }, Math.max(3, seconds) * 1000);
    return () => clearInterval(t);
  }, [paused, total, seconds, go]);

  const cell = (n: number) => `transition-opacity duration-700 ease-out [grid-area:1/1] ${i === n ? "opacity-100" : "pointer-events-none opacity-0"}`;
  return (
    <div
      className="relative" role="region" aria-roledescription="carousel" aria-label="Highlights"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}
    >
      <div className="grid">
        <div className={cell(0)} aria-hidden={i !== 0}>{first}</div>
        {slides.map((s, n) => <div key={s.id} className={cell(n + 1)} aria-hidden={i !== n + 1}><SlideFrame s={s} /></div>)}
      </div>
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 sm:bottom-6 sm:right-10">
        <button type="button" onClick={() => go(-1)} aria-label="Previous slide" className="glass grid h-8 w-8 place-items-center text-fg transition hover:text-accent">‹</button>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose slide">
          {Array.from({ length: total }, (_, n) => (
            <button key={n} type="button" role="tab" aria-selected={i === n} aria-label={`Slide ${n + 1}`} onClick={() => setI(n)} className={`h-[3px] transition-all ${i === n ? "w-7 bg-accent" : "w-3.5 bg-fg/40 hover:bg-fg/70"}`} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Next slide" className="glass grid h-8 w-8 place-items-center text-fg transition hover:text-accent">›</button>
      </div>
    </div>
  );
}
