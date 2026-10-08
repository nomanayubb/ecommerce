"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motionAllowed } from "@/lib/motion";
import { PARTICLE_PRESETS } from "@/themes/presets";
import { MascotFigure } from "../Mascot";
import { DOODLES } from "../Doodles";

/** Floating particles contained in one hero (flour dust, spices, steam, herbs, sparkles). */
export function HeroParticles({ kind }: { kind: keyof typeof PARTICLE_PRESETS }) {
  const p = PARTICLE_PRESETS[kind];
  if (!p) return null;
  return (
    <div aria-hidden className="decor pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: p.count }, (_, i) => (
        <span key={i} className={`decor-p decor-${p.motion}`} style={{
          left: `${(i * 37 + 11) % 100}%`, fontSize: (p.size ?? 20) * (0.7 + ((i * 13) % 6) / 10), opacity: p.opacity ?? 0.6,
          color: p.tint ? "rgb(var(--accent-bright))" : undefined, animationDuration: `${10 + ((i * 7) % 12)}s`, animationDelay: `-${(i * 5) % 17}s`,
        }}>{p.items[i % p.items.length]}</span>
      ))}
    </div>
  );
}

/** Button that leans toward the pointer when it is near (fine pointers, motion allowed). */
export function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      if (!motionAllowed()) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.9 + 40;
      el.style.transform = near ? `translate(${dx * strength}px, ${dy * strength}px)` : "";
    };
    addEventListener("pointermove", move, { passive: true });
    return () => removeEventListener("pointermove", move);
  }, [strength]);
  return <div ref={ref} className="inline-block transition-transform duration-200 ease-out">{children}</div>;
}

/** Headline where each letter rises in and lifts on hover, followed by a line that cycles through your own words. */
export function KineticHeading({ heading, words }: { heading: string; words: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2) return;
    const t = setInterval(() => { if (motionAllowed()) setI((n) => (n + 1) % words.length); }, 2400);
    return () => clearInterval(t);
  }, [words.length]);
  let n = 0;
  return (
    <>
      <h1 className="mt-5 text-4xl font-semibold uppercase leading-[1.08] tracking-[0.04em] sm:text-6xl" aria-label={heading + (words[0] ? ` ${words[0]}` : "")}>
        {heading.split(" ").map((w, wi) => (
          <span key={wi} className="inline-block whitespace-nowrap" aria-hidden>
            {[...w].map((ch, ci) => <span key={ci} className="kletter" style={{ "--i": n++ } as CSSProperties}>{ch}</span>)}&nbsp;
          </span>
        ))}
      </h1>
      {words.length > 0 && (
        <p className="relative mt-2 h-[1.2em] overflow-hidden text-4xl font-semibold uppercase tracking-[0.04em] text-gold sm:text-6xl" aria-hidden>
          {words.map((w, wi) => (
            <span key={w} className="absolute left-0 top-0 transition-all duration-700 ease-[cubic-bezier(.2,.7,.2,1)]" style={{ transform: `translateY(${(wi - i) * 110}%)`, opacity: wi === i ? 1 : 0 }}>{w}</span>
          ))}
        </p>
      )}
    </>
  );
}

/** Background image and drifting doodles that move at different speeds with scroll and pointer. */
export function ParallaxLayers({ imageUrl }: { imageUrl?: string }) {
  const bg = useRef<HTMLDivElement>(null);
  const mid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = bg.current?.parentElement;
    if (!host) return;
    let raf = 0, px = 0, py = 0;
    const apply = () => {
      raf = 0;
      if (!motionAllowed()) return;
      const r = host.getBoundingClientRect();
      const prog = Math.max(-1, Math.min(1, -r.top / Math.max(1, r.height)));
      if (bg.current) bg.current.style.transform = `translate3d(${px * -10}px, ${prog * 60 + py * -8}px, 0) scale(1.12)`;
      if (mid.current) mid.current.style.transform = `translate3d(${px * 22}px, ${prog * 130 + py * 14}px, 0)`;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const move = (e: PointerEvent) => { px = (e.clientX / innerWidth - 0.5) * 2; py = (e.clientY / innerHeight - 0.5) * 2; queue(); };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("pointermove", move, { passive: true });
    queue();
    return () => { removeEventListener("scroll", queue); removeEventListener("pointermove", move); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <>
      <div ref={bg} aria-hidden className="absolute -inset-6 will-change-transform" style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "radial-gradient(circle at 70% 30%, rgb(var(--accent-bright) / .25), transparent 60%)" }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />
      <div ref={mid} aria-hidden className="pointer-events-none absolute inset-0 hidden text-gold/70 will-change-transform md:block">
        {DOODLES.slice(0, 5).map((D, k) => <span key={k} className="absolute" style={{ right: `${6 + k * 11}%`, top: `${12 + ((k * 29) % 62)}%`, opacity: 0.55 }}><D size={52 + (k % 3) * 18} /></span>)}
      </div>
    </>
  );
}

/** Doodles that float around the headline. */
export function FloatingDoodles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden text-gold/60">
      {DOODLES.map((D, k) => (
        <span key={k} className="float-g absolute" style={{ left: `${(k * 41 + 8) % 92}%`, top: `${(k * 23 + 10) % 78}%`, animationDelay: `-${k * 1.3}s`, animationDuration: `${6 + (k % 4) * 1.5}s`, opacity: 0.5 }}>
          <D size={44 + (k % 3) * 16} style={{ transform: `rotate(${(k * 37) % 40 - 20}deg)` }} />
        </span>
      ))}
    </div>
  );
}

/** Before / after photo slider. Keyboard and touch friendly (it is a real range input). */
export function CompareSlider({ before, after, labels = ["Before", "After"] }: { before: string; after: string; labels?: [string, string] }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative h-full min-h-72 w-full select-none overflow-hidden">
      <img src={after} alt={labels[1]} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <img src={before} alt={labels[0]} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} draggable={false} />
      <span className="glass absolute left-3 top-3 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em]">{labels[0]}</span>
      <span className="glass absolute right-3 top-3 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em]">{labels[1]}</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-gold" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold bg-black/60 text-gold">⇆</span>
      </div>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Reveal before and after" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
}

/** The mascot tells the brand story one line at a time. */
export function MascotStory({ lines }: { lines: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (lines.length < 2) return;
    const t = setInterval(() => { if (motionAllowed()) setI((n) => (n + 1) % lines.length); }, 3600);
    return () => clearInterval(t);
  }, [lines.length]);
  if (!lines.length) return null;
  return (
    <div className="flex items-end gap-4 text-gold">
      <MascotFigure mood="wave" size={92} className="mascot-float shrink-0" />
      <p key={i} role="status" className="fade-up glass max-w-xs px-4 py-3 text-sm leading-relaxed text-ondark">{lines[i]}</p>
    </div>
  );
}
