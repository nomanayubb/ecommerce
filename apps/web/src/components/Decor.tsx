import type { Decor as DecorConfig } from "@/themes/types";

// Server component, pure CSS animation, deterministic positions (no hydration mismatch).
export function Decor({ decor }: { decor?: DecorConfig }) {
  if (!decor) return null;
  const { particles: p, corners: c } = decor;
  return (
    <div aria-hidden className="decor pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {p &&
        Array.from({ length: p.count }, (_, i) => (
          <span
            key={i}
            className={`decor-p decor-${p.motion}`}
            style={{
              left: `${(i * 37 + 11) % 100}%`,
              fontSize: (p.size ?? 20) * (0.7 + ((i * 13) % 6) / 10),
              opacity: p.opacity ?? 0.6,
              color: p.tint ? "rgb(var(--accent))" : undefined,
              animationDuration: `${12 + ((i * 7) % 14)}s`,
              animationDelay: `-${(i * 5) % 17}s`,
            }}
          >
            {p.items[i % p.items.length]}
          </span>
        ))}
      {c &&
        (["topLeft", "topRight", "bottomLeft", "bottomRight"] as const).map(
          (k) =>
            c[k] && (
              <span
                key={k}
                className="absolute select-none"
                style={{
                  fontSize: c.size ?? 48,
                  top: k.startsWith("top") ? 40 : undefined,
                  bottom: k.startsWith("bottom") ? 0 : undefined,
                  left: k.endsWith("Left") ? 0 : undefined,
                  right: k.endsWith("Right") ? 0 : undefined,
                }}
              >
                {c[k]}
              </span>
            )
        )}
    </div>
  );
}
