"use client";

import { useRef } from "react";
import { motionAllowed } from "@/lib/motion";

/**
 * The real logo mark extruded into depth with stacked layers (CSS 3D, no library, ~0 JS weight).
 * Tilts with the pointer; gently sways when idle; static when motion is off.
 */
export function Logo3D({ src, srcDark, size = 220, alt }: { src: string; srcDark?: string; size?: number; alt: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const LAYERS = 9;

  const tilt = (x: number, y: number) => {
    if (stage.current) stage.current.style.transform = `rotateX(${(-y * 24).toFixed(1)}deg) rotateY(${(x * 32).toFixed(1)}deg)`;
  };
  return (
    <div
      className="logo3d-scene mx-auto select-none"
      style={{ width: size, height: size }}
      onPointerMove={(e) => {
        if (!motionAllowed()) return;
        const r = e.currentTarget.getBoundingClientRect();
        stage.current?.classList.remove("logo3d-sway");
        tilt((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => { if (stage.current) { stage.current.style.transform = ""; stage.current.classList.add("logo3d-sway"); } }}
    >
      <div ref={stage} className="logo3d-stage logo3d-sway">
        {Array.from({ length: LAYERS }, (_, i) => {
          const front = i === LAYERS - 1;
          return (
            <span key={i} className="logo3d-layer" style={{ transform: `translateZ(${(i - LAYERS + 1) * 5}px)`, filter: front ? undefined : `brightness(${0.35 + i * 0.05})` }}>
              <img src={src} alt={front ? alt : ""} aria-hidden={front ? undefined : true} width={size} height={size} className="logo-on-light h-full w-full object-contain" />
              <img src={srcDark || src} alt="" aria-hidden width={size} height={size} className="logo-on-dark h-full w-full object-contain" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
