"use client";

import { useEffect, useRef, useState } from "react";
import { TimerIcon } from "./icons/set";

function beep() {
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    const c = new C();
    [0, 0.35, 0.7].forEach((t) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, c.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.28);
      o.connect(g).connect(c.destination); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.3);
    });
    setTimeout(() => c.close(), 1500);
  } catch {}
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * Kitchen timer. Starts only when the shopper presses Start (so the alarm beep is expected), keeps running in the
 * background tab, and shows "Time is up" even if the sound is blocked.
 */
export function CookingTimer({ minutes = 10, label = "Cooking timer", compact = false }: { minutes?: number; label?: string; compact?: boolean }) {
  const [total, setTotal] = useState(minutes * 60);
  const [left, setLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { setRunning(false); setDone(true); beep(); }
    }, 250);
    return () => clearInterval(t);
  }, [running]);

  const start = () => { endAt.current = Date.now() + left * 1000; setDone(false); setRunning(true); };
  const reset = (m = total / 60) => { setRunning(false); setDone(false); setTotal(m * 60); setLeft(m * 60); };
  const pct = total ? ((total - left) / total) * 100 : 0;

  return (
    <div className={`border border-line bg-card ${compact ? "p-3" : "p-5"}`} role="timer" aria-label={label}>
      <div className="flex items-center gap-3">
        <TimerIcon size={compact ? 20 : 26} className={done ? "text-accent" : running ? "text-accent" : "text-muted"} />
        <p className={`font-mono ${compact ? "text-xl" : "text-3xl"} ${done ? "text-accent" : ""}`} aria-live="off">{fmt(left)}</p>
        <div className="ml-auto flex gap-2">
          {!running ? <button type="button" onClick={start} disabled={left === 0} className="btn btn-primary !px-4 !py-2">{left < total && left > 0 ? "Resume" : "Start"}</button>
            : <button type="button" onClick={() => setRunning(false)} className="btn btn-ghost !px-4 !py-2">Pause</button>}
          <button type="button" onClick={() => reset()} className="btn btn-ghost !px-3 !py-2" aria-label="Reset timer">Reset</button>
        </div>
      </div>
      <div className="mt-3 h-1 bg-line"><div className="h-1 bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
      {done && <p role="alert" className="mt-3 text-sm font-semibold text-accent">Time is up!</p>}
      {!compact && !running && left === total && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">{[1, 3, 5, 10, 15, 30, 45, 60].map((m) => <button key={m} type="button" onClick={() => reset(m)} className={`border px-2.5 py-1 transition hover:border-accent hover:text-accent ${total === m * 60 ? "border-accent text-accent" : "border-line text-muted"}`}>{m} min</button>)}</div>
      )}
    </div>
  );
}
