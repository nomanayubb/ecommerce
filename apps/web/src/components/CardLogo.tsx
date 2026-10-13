"use client";

import { useSite } from "./Site";

/** The AVERIXA logo on collection pictures, animated like the one in the header (gold sheen, soft glow, gentle sway). */
export function CardLogo({ className = "bottom-3 right-4" }: { className?: string }) {
  const { branding } = useSite();
  const src = branding.logoUrlDark || branding.logoUrl;
  if (!src) return null;
  return (
    <span aria-hidden className={`card-logo pointer-events-none absolute z-10 ${className}`} style={{ "--logo-mask": `url(${src})` } as React.CSSProperties}>
      <img src={src} alt="" width={185} height={36} loading="lazy" className="h-6 w-auto max-w-none sm:h-7" />
      <span className="logo-sheen" />
    </span>
  );
}
