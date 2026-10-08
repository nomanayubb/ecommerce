"use client";

import { useEffect, useState } from "react";
import { motionAllowed } from "@/lib/motion";

const COLORS = ["rgb(var(--accent-bright))", "rgb(var(--on-dark))", "rgb(var(--accent))", "rgb(var(--fg))"];

/** Brand-coloured confetti. Listens for the "confetti" window event (see lib/motion fireConfetti). */
export function ConfettiHost() {
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const fire = () => {
      if (!motionAllowed()) return;
      setBurst((b) => b + 1);
      clearTimeout(t);
      t = setTimeout(() => setBurst(0), 4200);
    };
    window.addEventListener("confetti", fire);
    return () => { window.removeEventListener("confetti", fire); clearTimeout(t); };
  }, []);
  if (!burst) return null;
  return (
    <div key={burst} aria-hidden className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {Array.from({ length: 48 }, (_, i) => (
        <span
          key={i} className="confetti-piece"
          style={{
            left: `${(i * 53 + 7) % 100}%`, background: COLORS[i % COLORS.length],
            width: 6 + (i % 4) * 2, height: i % 3 === 0 ? 6 + (i % 4) * 2 : 12 + (i % 3) * 3,
            animationDuration: `${2.4 + (i % 5) * 0.35}s`, animationDelay: `${(i % 12) * 60}ms`,
            ["--sway" as string]: `${((i % 7) - 3) * 22}px`, ["--spin" as string]: `${(i % 2 ? 1 : -1) * (360 + (i % 5) * 120)}deg`,
          }}
        />
      ))}
    </div>
  );
}
