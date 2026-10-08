"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { motionAllowed } from "@/lib/motion";

export type Mood = "idle" | "happy" | "sad" | "wave" | "confused" | "celebrate" | "carry";
const A = "rgb(var(--accent))";

/**
 * AVERIXA's mascot: a little cart-bot built from the logo's own language
 * (thin 2px angular strokes, gold + ink, basket + handle + wheels, antenna echoing the A).
 * Pure SVG; moods change eyes, mouth, props and animation.
 */
export function MascotFigure({ mood = "idle", size = 64, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const happy = mood === "happy" || mood === "celebrate" || mood === "wave";
  return (
    <svg
      viewBox="0 0 64 64" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter"
      role="img" aria-label="AVERIXA assistant" className={`mascot mascot-${mood} ${className}`}
    >
      <g className="m-body">
        {mood === "carry" ? (
          <g stroke={A}><path d="M24 14h16v11H24zM32 14v11M24 19.5h16" /></g>
        ) : (
          <><path d="M32 26V15" /><circle cx="32" cy="12" r="2.5" stroke={A} /></>
        )}
        <path d="M12 26h40l-5 20H17z" />
        <path d="M52 26l4-12h6" stroke={A} />
        <circle cx="22" cy="53" r="4" stroke={A} /><circle cx="42" cy="53" r="4" stroke={A} />
        <g className="m-pupils">
          <g className="m-blink">
            {happy ? <path d="M24 36l2-3 2 3M36 36l2-3 2 3" /> : mood === "sad" ? <path d="M24 33l4 2M40 33l-4 2M26 37v2M38 37v2" /> : <path d="M26 33v5M38 33v5" />}
          </g>
        </g>
        {happy ? <path d="M28 40l4 3 4-3" /> : mood === "sad" ? <path d="M28 44l4-3 4 3" /> : mood === "confused" ? <path d="M29 42l6-2" /> : <path d="M29 41h6" />}
        {mood === "wave" && <g className="m-arm"><path d="M12 34L3 27" stroke={A} /></g>}
        {mood === "celebrate" && <g stroke={A}><path d="M8 8v7M4.5 11.5h7M56 2v7M52.5 5.5h7M3 40v5M.5 42.5h5" /></g>}
        {mood === "confused" && <g stroke={A}><path d="M50 7c0-4 7-4 7 0 0 3-3 3-3 7" /><path d="M54 19h.01" strokeWidth={3} /></g>}
      </g>
    </svg>
  );
}

const TIPS: [RegExp, string][] = [
  [/^\/$/, "Welcome! Looking for something special?"],
  [/^\/products$/, "Tip: compare up to 4 products side by side."],
  [/^\/products\/.+/, "Not sure about timing? Check delivery for your city."],
  [/^\/checkout/, "Almost there. Cash on delivery, no card needed."],
  [/^\/wishlist/, "Your saved favourites live here."],
];

/** Floating assistant: reacts to the bag, the page and your pointer. Can be switched off (remembered). */
export function MascotAssistant() {
  const { count } = useCart();
  const path = usePathname();
  const [off, setOff] = useState(true); // start hidden until we know the saved choice (no flash)
  const [mood, setMood] = useState<Mood>("idle");
  const [text, setText] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const prev = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const say = (m: Mood, t: string, ms = 4200) => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setMood(m); setText(t);
    timers.current.push(setTimeout(() => setText(""), ms), setTimeout(() => setMood("idle"), ms - 600));
  };

  useEffect(() => {
    try { setOff(localStorage.getItem("mascot") === "off"); } catch { setOff(false); }
    const onEvt = (e: Event) => { const d = (e as CustomEvent).detail; say(d.mood ?? "happy", d.text ?? ""); };
    const onToggle = () => setOff((o) => { const n = !o; try { localStorage.setItem("mascot", n ? "off" : "on"); } catch {} return n; });
    window.addEventListener("mascot", onEvt);
    window.addEventListener("mascot-toggle", onToggle);
    return () => { window.removeEventListener("mascot", onEvt); window.removeEventListener("mascot-toggle", onToggle); timers.current.forEach(clearTimeout); };
  }, []);

  // React to the bag
  useEffect(() => {
    if (prev.current !== null && count !== prev.current) {
      if (count > prev.current) say("celebrate", "Added to your bag!");
      else say("sad", count === 0 ? "Your bag is empty now." : "Removed. Changed your mind?");
    }
    prev.current = count;
  }, [count]);

  // Page tips, once per page type per session
  useEffect(() => {
    const tip = TIPS.find(([re]) => re.test(path));
    if (!tip) return;
    // The "shown" flag is set only when the bubble really appears (safe against effect re-runs / cancelled timers).
    const t = setTimeout(() => {
      try {
        const k = `tip:${tip[0].source}`;
        if (sessionStorage.getItem(k)) return;
        sessionStorage.setItem(k, "1");
      } catch {}
      say(path.startsWith("/checkout") ? "carry" : "wave", tip[1], 5200);
    }, 1400);
    return () => clearTimeout(t);
  }, [path]);

  // Eyes follow the pointer
  useEffect(() => {
    if (off) return;
    const move = (e: PointerEvent) => {
      const el = wrap.current;
      if (!el || !motionAllowed() || !matchMedia("(pointer: fine)").matches) return;
      const r = el.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 400));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 400));
      el.style.setProperty("--lx", `${(dx * 2).toFixed(2)}px`);
      el.style.setProperty("--ly", `${(dy * 1.5).toFixed(2)}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [off]);

  if (off) return null;
  return (
    <div ref={wrap} className="pointer-events-none fixed bottom-24 right-3 z-40 flex items-end gap-2 md:bottom-6 md:right-5">
      {text && (
        <p role="status" className="glass pointer-events-auto mb-8 max-w-[210px] px-3 py-2 text-xs leading-snug shadow-2xl">{text}</p>
      )}
      <button
        type="button" aria-label="AVERIXA assistant. Click to say hi"
        onClick={() => say("wave", "Hi! I am here if you need me.")}
        className="pointer-events-auto text-fg transition hover:text-accent"
      >
        <MascotFigure mood={mood} size={58} className="mascot-float" />
      </button>
    </div>
  );
}

/** Footer switch for the assistant. */
export function AssistantToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => { try { setOn(localStorage.getItem("mascot") !== "off"); } catch {} }, []);
  return (
    <button
      type="button" aria-pressed={on}
      onClick={() => { window.dispatchEvent(new Event("mascot-toggle")); setOn((v) => !v); }}
      className="text-[0.7rem] uppercase tracking-[0.25em] text-muted transition hover:text-accent"
    >
      Assistant: {on ? "on" : "off"}
    </button>
  );
}
