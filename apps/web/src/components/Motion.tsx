"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Page progress: a thin gold bar, or (kitchen look) a measuring cup that fills as you scroll. */
export function ScrollProgress({ mode = "bar" }: { mode?: "bar" | "cup" }) {
  const bar = useRef<HTMLDivElement>(null);
  const liquid = useRef<SVGRectElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement.scrollHeight - innerHeight;
      const p = h > 0 ? Math.min(1, scrollY / h) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (liquid.current) { const full = 30; liquid.current.setAttribute("y", String(7 + full * (1 - p))); liquid.current.setAttribute("height", String(full * p)); }
      if (label.current) label.current.textContent = `${Math.round(p * 100)}%`;
      document.documentElement.toggleAttribute("data-scrolled", scrollY > 8);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [mode]);
  if (mode === "cup") {
    return (
      <div aria-hidden className="pointer-events-none fixed right-2 top-1/2 z-[70] hidden -translate-y-1/2 flex-col items-center gap-1 sm:flex">
        <svg viewBox="0 0 28 44" width={26} height={42} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-muted">
          <clipPath id="cupclip"><path d="M5 7h18l-2 31H7z" /></clipPath>
          <rect ref={liquid} x="0" y="37" width="28" height="0" fill="rgb(var(--accent))" fillOpacity=".85" clipPath="url(#cupclip)" />
          <path d="M5 7h18l-2 31H7z" /><path d="M23 12h3a2 2 0 0 1 0 6h-3" /><path d="M8 17h4M8 24h6M8 31h4" strokeOpacity=".5" />
        </svg>
        <span ref={label} className="text-[0.55rem] tracking-widest text-muted">0%</span>
      </div>
    );
  }
  return <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5"><div ref={bar} className="h-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} /></div>;
}

/** Fades/slides children in when they scroll into view. Content stays visible without JS. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

/** Subtle 3D tilt that follows the pointer. Only on fine pointers and when motion is "full". */
export function Tilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = () => {
    const d = document.documentElement.dataset;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches && d.motionPref !== "on";
    return matchMedia("(pointer: fine)").matches && d.motion === "full" && d.motionPref !== "off" && !reduced;
  };
  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      onPointerMove={(e) => {
        if (!allowed() || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        ref.current.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateZ(0)`;
      }}
      onPointerLeave={() => { if (ref.current) ref.current.style.transform = ""; }}
    >
      {children}
    </div>
  );
}
