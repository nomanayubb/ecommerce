import type { Visuals } from "@/lib/api";
import { MascotFigure } from "./Mascot";

/**
 * Loading indicators. `ring` is neutral; `stir` (a spoon circling a pot), `chop` (a knife on a board) and `pulse`
 * match kitchen stores. Pure SVG + CSS, so it works in server components. Pick the style in admin > Visual effects.
 */
export function Loader({ variant = "ring", size = 48, label = "Loading" }: { variant?: Visuals["loader"]; size?: number; label?: string }) {
  const s = { width: size, height: size };
  return (
    <span role="status" aria-label={label} className="inline-block text-accent" style={s}>
      {variant === "ring" && (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2.5} className="loader-spin" style={s}>
          <circle cx="24" cy="24" r="18" strokeOpacity=".2" /><path d="M24 6a18 18 0 0 1 18 18" strokeLinecap="round" />
        </svg>
      )}
      {variant === "mascot" && <MascotFigure mood="carry" size={size} className="loader-hop" />}
      {variant === "pulse" && (
        <svg viewBox="0 0 48 48" fill="currentColor" style={s}>
          {[0, 1, 2].map((i) => <circle key={i} cx={12 + i * 12} cy="24" r="4" className="loader-dot" style={{ animationDelay: `${i * 160}ms` }} />)}
        </svg>
      )}
      {variant === "stir" && (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={s}>
          <path d="M8 22h32v8a10 10 0 0 1-10 10H18A10 10 0 0 1 8 30z" />
          <path d="M6 24h2M40 24h2" />
          <g className="loader-stir"><path d="M24 4v20" /><ellipse cx="24" cy="26" rx="4" ry="2.5" /></g>
          <path d="M14 18c0-2 2-2 2-4M22 17c0-2 2-2 2-4M30 18c0-2 2-2 2-4" strokeOpacity=".5" className="loader-steam" />
        </svg>
      )}
      {variant === "chop" && (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={s}>
          <rect x="6" y="34" width="36" height="6" />
          <circle cx="16" cy="31" r="3" /><circle cx="24" cy="31" r="3" /><circle cx="32" cy="31" r="3" />
          <g className="loader-chop"><path d="M10 8l20 4-2 6-18-4z" /><path d="M30 12l10 2" /></g>
        </svg>
      )}
    </span>
  );
}
