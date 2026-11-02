"use client";

import { useState } from "react";
import { motionAllowed } from "@/lib/motion";

/** Plays a short muted preview over a product photo while a mouse hovers it (never on touch screens or with motion off). */
export function HoverVideo({ src }: { src: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="absolute inset-0" onPointerEnter={(e) => { if (e.pointerType === "mouse" && motionAllowed()) setOn(true); }} onPointerLeave={() => setOn(false)}>
      {on && <video src={src} autoPlay muted loop playsInline preload="none" aria-hidden className="absolute inset-0 h-full w-full object-cover" />}
    </div>
  );
}
