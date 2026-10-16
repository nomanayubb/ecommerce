"use client";

import { useSite } from "./Site";

/** Small AVERIXA logo on product pictures when the shop turns the watermark on (Brand & settings, Visuals). */
export function ImageMark({ behind = false }: { behind?: boolean }) {
  const { branding } = useSite();
  const src = branding.visuals?.watermark ? branding.logoUrlDark || branding.logoUrl : "";
  if (!src) return null;
  if (behind) return <img src={src} alt="" aria-hidden width={240} height={48} loading="lazy" className="pointer-events-none absolute left-1/2 top-[58%] w-[58%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[.09]" />;
  return <img src={src} alt="" aria-hidden width={120} height={24} loading="lazy" className="image-mark-corner pointer-events-none absolute bottom-2 right-2 z-[1] h-3.5 w-auto opacity-60 drop-shadow sm:h-4" />;
}
