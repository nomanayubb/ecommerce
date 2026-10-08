"use client";

import { useEffect, useState } from "react";
import { motionAllowed } from "@/lib/motion";

/** Top bar. Several messages rotate (when motion is allowed); with motion off, the first stays and the rest remain reachable by screen readers. */
export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const t = setInterval(() => { if (motionAllowed()) setI((n) => (n + 1) % messages.length); }, 4500);
    return () => clearInterval(t);
  }, [messages.length]);
  if (!messages.length) return null;
  return (
    <div className="bg-darksurface px-4 py-2 text-center text-[0.68rem] font-medium uppercase tracking-[0.25em] text-gold" role="region" aria-label="Announcements">
      <p key={i} className="fade-up">{messages[i]}</p>
      {messages.slice(1).map((m, n) => n + 1 !== i && <span key={n} className="sr-only">{m}</span>)}
    </div>
  );
}
