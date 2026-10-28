"use client";

import { useEffect, useState } from "react";

/** Reads an element aloud with the browser's own voice (nothing is downloaded). Hidden where speech is not supported. */
export function ListenButton({ targetId, className = "" }: { targetId: string; className?: string }) {
  const [ok, setOk] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => { setOk(typeof speechSynthesis !== "undefined"); return () => { try { speechSynthesis.cancel(); } catch {} }; }, []);
  if (!ok) return null;
  const toggle = () => {
    if (on) { speechSynthesis.cancel(); setOn(false); return; }
    const text = document.getElementById(targetId)?.innerText;
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = document.documentElement.lang || "en-US"; u.rate = 1;
    u.onend = u.onerror = () => setOn(false);
    speechSynthesis.cancel(); speechSynthesis.speak(u); setOn(true);
  };
  return <button type="button" onClick={toggle} aria-pressed={on} className={`text-xs font-semibold uppercase tracking-[0.2em] text-muted transition hover:text-accent ${className}`}>{on ? "Stop listening" : "Listen"}</button>;
}
