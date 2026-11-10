"use client";

import { useEffect, useState } from "react";
import { playSound } from "@/lib/sound";

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
