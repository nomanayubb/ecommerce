"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_VISUALS, type Visuals } from "@/lib/api";
import { motionAllowed } from "@/lib/motion";
import { playSound, soundEnabled } from "@/lib/sound";
import { Loader } from "./Loader";

const touch = () => typeof matchMedia !== "undefined" && !matchMedia("(pointer: fine)").matches;

/** Custom cursor, page transition wipe, add-to-bag splash and UI sounds. Each is a setting in admin > Visual effects. */
export function VisualsHost({ visuals }: { visuals?: Partial<Visuals> }) {
  const v = { ...DEFAULT_VISUALS, ...visuals };
  return (
    <>
      {v.cursor !== "none" && <Cursor variant={v.cursor} />}
      {v.transition !== "none" && <PageTransition mode={v.transition} loader={v.loader} />}
      <Reactions splash={v.addSplash} sound={v.sound} />
    </>
  );
}

/* ---------------------------------------------------------------- cursor */
function Cursor({ variant }: { variant: "ring" | "whisk" }) {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (touch()) return;
    setOn(true);
    document.documentElement.classList.add("has-cursor");
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf = 0, hot = false, down = false;
    const loop = () => {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      if (ring.current) ring.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%) scale(${down ? 0.8 : hot ? 1.9 : 1})`;
      raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      if (dot.current) dot.current.style.transform = `translate(${x}px, ${y}px)`;
      hot = !!(e.target as HTMLElement | null)?.closest?.("a,button,[role=button],summary,label,select,.btn");
      ring.current?.toggleAttribute("data-hot", hot);
    };
    const dn = () => { down = true; };
    const up = () => { down = false; };
    addEventListener("pointermove", move, { passive: true });
    addEventListener("pointerdown", dn); addEventListener("pointerup", up);
    raf = requestAnimationFrame(loop);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move); removeEventListener("pointerdown", dn); removeEventListener("pointerup", up);
    };
  }, [variant]);

  if (!on) return null;
  return (
    <>
      {variant === "ring" ? (
        <>
          <div ref={ring} aria-hidden className="cursor-ring pointer-events-none fixed left-0 top-0 z-[100] h-9 w-9 rounded-full border border-accent transition-[background-color,border-color] duration-200" />
          <div ref={dot} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[100] -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-accent" />
        </>
      ) : (
        <>
          <div ref={ring} aria-hidden className="cursor-whisk pointer-events-none fixed left-0 top-0 z-[100] text-accent">
            <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="-rotate-[35deg]"><path d="M12 15C7.5 15 6 9 8 4M12 15c4.5 0 6-6 4-11M12 15c-2.2 0-2.6-6 0-11M12 15c2.2 0 2.6-6 0-11" /><path d="M12 15v7" /></svg>
          </div>
          <div ref={dot} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[100] -ml-[2px] -mt-[2px] h-1 w-1 rounded-full bg-accent" />
        </>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- page transitions */
function PageTransition({ mode, loader }: { mode: "fade" | "wipe"; loader: Visuals["loader"] }) {
  const router = useRouter();
  const path = usePathname();
  const [phase, setPhase] = useState<"idle" | "in" | "out">("idle");
  const target = useRef<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !motionAllowed()) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute("download") || a.origin !== location.origin) return;
      const next = a.pathname + a.search;
      if (next === location.pathname + location.search || a.pathname.startsWith("/api/") || (a.hash && a.pathname === location.pathname)) return;
      e.preventDefault();
      e.stopPropagation();
      target.current = next;
      setPhase("in");
      setTimeout(() => { if (target.current) router.push(target.current); }, mode === "wipe" ? 320 : 160);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, mode]);

  // The new page arrived: reveal it (also covers the browser back button, where we never covered).
  useEffect(() => {
    if (phase === "in") { target.current = null; setPhase("out"); const t = setTimeout(() => setPhase("idle"), 420); return () => clearTimeout(t); }
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safety: never stay covered if navigation failed.
  useEffect(() => {
    if (phase !== "in") return;
    const t = setTimeout(() => { setPhase("idle"); target.current = null; }, 4000);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "idle") return null;
  return (
    <div aria-hidden className={`ptrans ptrans-${mode} ptrans-${phase} pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-bg`}>
      {mode === "wipe" && <div className="text-accent"><Loader variant={loader} size={56} /></div>}
    </div>
  );
}

/* ---------------------------------------------------------------- bag splash + sounds */
function Reactions({ splash, sound }: { splash: boolean; sound: boolean }) {
  useEffect(() => {
    document.documentElement.dataset.sound = sound ? "1" : "0";
  }, [sound]);

  useEffect(() => {
    if (!sound && !splash) return;
    const burst = () => {
      if (!splash || !motionAllowed()) return;
      const bag = document.querySelector("[data-bag]") as HTMLElement | null;
      if (!bag) return;
      const r = bag.getBoundingClientRect();
      // Drops spray out of the bag icon once the flying thumbnail lands (about 700 ms after the click).
      setTimeout(() => {
        for (let i = 0; i < 12; i++) {
          const d = document.createElement("span");
          const size = 4 + Math.random() * 5;
          d.setAttribute("aria-hidden", "true");
          d.style.cssText = `position:fixed;z-index:96;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:${size}px;height:${size}px;border-radius:9999px;background:rgb(var(--accent));pointer-events:none`;
          document.body.appendChild(d);
          const ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
          const dist = 26 + Math.random() * 30;
          const a = d.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist + 14}px) scale(.2)`, opacity: 0 }], { duration: 520 + Math.random() * 200, easing: "cubic-bezier(.2,.7,.3,1)" });
          a.onfinish = () => d.remove();
          setTimeout(() => d.remove(), 1500);
        }
      }, 700);
    };
    const onFly = () => { playSound("pop"); burst(); };
    const onConfetti = () => playSound("chime");
    let lastTick = 0;
    const onOver = (e: PointerEvent) => {
      if (!soundEnabled() || e.pointerType !== "mouse") return;
      const t = (e.target as HTMLElement | null)?.closest?.("a,button,.btn");
      const now = performance.now();
      if (t && now - lastTick > 90 && !(e.relatedTarget && t.contains(e.relatedTarget as Node))) { lastTick = now; playSound("tick"); }
    };
    const onLogo = (e: MouseEvent) => { if ((e.target as HTMLElement | null)?.closest?.("[data-logo]")) playSound("jingle"); };
    addEventListener("cart-fly", onFly);
    addEventListener("confetti", onConfetti);
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("click", onLogo);
    return () => {
      removeEventListener("cart-fly", onFly); removeEventListener("confetti", onConfetti);
      document.removeEventListener("pointerover", onOver); document.removeEventListener("click", onLogo);
    };
  }, [splash, sound]);
  return null;
}

/** Header switch: visitors choose whether sounds play. Only shown when the store enabled sound. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { try { setOn(localStorage.getItem("sound") === "on"); } catch {} }, []);
  return (
    <button
      type="button" aria-pressed={on} aria-label={on ? "Sounds on" : "Sounds off"} title={on ? "Sounds on" : "Sounds off"}
      onClick={() => { const n = !on; setOn(n); try { localStorage.setItem("sound", n ? "on" : "off"); } catch {} if (n) setTimeout(() => playSound("pop"), 30); }}
      className={`items-center p-2 transition hover:text-accent ${on ? "text-accent" : "text-muted"} ${className}`}
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="square" aria-hidden>
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        {on ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" stroke="rgb(var(--accent))" /> : <path d="M16 9l5 6M21 9l-5 6" stroke="rgb(var(--accent))" />}
      </svg>
    </button>
  );
}
