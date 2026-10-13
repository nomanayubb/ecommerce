"use client";

import { useSite } from "./Site";

/** Small AVERIXA logo on product pictures when the shop turns the watermark on (Brand & settings, Visuals). */
export function ImageMark() {
  const { branding } = useSite();
  const src = branding.visuals?.watermark ? branding.logoUrlDark || branding.logoUrl : "";
  if (!src) return null;
  return <img src={src} alt="" aria-hidden width={120} height={24} loading="lazy" className="pointer-events-none absolute bottom-2 right-2 z-[1] h-3.5 w-auto opacity-60 drop-shadow sm:h-4" />;
}
