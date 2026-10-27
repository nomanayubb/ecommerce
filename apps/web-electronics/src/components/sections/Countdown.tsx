"use client";

import { useEffect, useState } from "react";

/** Counts down to `endsAt` (ISO). Renders after mount so server and browser never disagree about the time. */
export function Countdown({ endsAt, expiredText }: { endsAt: string; expiredText?: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  if (left === null) return <div className="mt-8 h-16" aria-hidden />;
  if (left === 0) return <p className="mt-8 text-lg">{expiredText || "This offer has ended."}</p>;
  const d = Math.floor(left / 86400000), h = Math.floor((left % 86400000) / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
  return (
    <div role="timer" aria-label="Time left" className="mt-8 flex justify-center gap-3">
      {([["Days", d], ["Hours", h], ["Mins", m], ["Secs", s]] as const).map(([l, n]) => (
        <div key={l} className="w-16 border border-ondark/30 py-3"><p className="text-2xl font-semibold tabular-nums">{String(n).padStart(2, "0")}</p><p className="text-[0.6rem] uppercase tracking-[0.2em] text-ondark/60">{l}</p></div>
      ))}
    </div>
  );
}
