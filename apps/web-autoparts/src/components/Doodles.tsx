import type { SVGProps } from "react";

/**
 * Hand-drawn ingredient and tool illustrations: loose round-capped strokes, slightly uneven on purpose.
 * They use `currentColor` for the outline and the accent colour for one detail, so they follow the theme.
 */
type D = Omit<SVGProps<SVGSVGElement>, "title"> & { size?: number };
const A = "rgb(var(--accent))";

function Doodle({ size = 64, children, ...rest }: D) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

export const DoodleWhisk = (p: D) => <Doodle {...p}><path d="M32 41C21 41 17 26 21 9M32 41c11 0 15-15 11-32M32 41c-5 0-6.4-15.5 0-32M32 41c5 0 6.4-15.5 0-32" /><path d="M31.6 41.4l.4 15.2" stroke={A} /><path d="M28 56.8c1.5 1.5 6.5 1.6 8 .1" stroke={A} /></Doodle>;
export const DoodleLemon = (p: D) => <Doodle {...p}><path d="M10 33c1-11 12-19 23-19 4 0 8 1 11 3 5-1 9 1 10 4-2 2-4 3-6 3 1 3 1 6 0 9-3 10-13 16-25 14-8-2-14-8-13-14z" /><path d="M24 24c-3 2-5 6-5 10M30 22c5 1 10 5 12 10" stroke={A} /><path d="M46 17c1-5 4-8 8-9" /></Doodle>;
export const DoodleChili = (p: D) => <Doodle {...p}><path d="M44 14c-12 1-26 9-31 25-2 6-1 10 3 8 8-3 11-8 16-14 4-5 9-10 12-19z" /><path d="M44 14c1-4 4-6 8-6M46 10c2 1 4 3 5 6" stroke={A} /><path d="M22 36c4-5 9-9 15-12" strokeOpacity=".5" /></Doodle>;
export const DoodleHerb = (p: D) => <Doodle {...p}><path d="M32 58c1-14 1-28-1-46" /><path d="M31 44c-8-1-14-6-16-14 8 0 14 5 16 14zM32 32c7-1 12-5 15-12-8-1-13 3-15 12zM31 22c-5-2-8-6-9-12 6 1 9 5 9 12z" stroke={A} /><path d="M33 48c6-1 11-4 14-10-7-1-12 3-14 10z" /></Doodle>;
export const DoodleSpoon = (p: D) => <Doodle {...p}><path d="M24 10c-6 2-9 9-7 14s9 8 14 5c5-3 6-11 2-16-3-4-6-4-9-3z" /><path d="M31 29l22 27c1 2 3 2 4 1s1-3 0-4L38 25" stroke={A} /></Doodle>;
export const DoodleGarlic = (p: D) => <Doodle {...p}><path d="M32 8c-2 6-3 9-3 12-9 2-17 9-17 20 0 9 9 16 20 16s20-7 20-16c0-11-8-18-17-20 0-3-1-6-3-12z" /><path d="M32 22c-5 6-7 14-6 31M32 22c5 6 7 14 6 31" strokeOpacity=".55" /><path d="M32 8c1-3 3-4 5-4" stroke={A} /></Doodle>;
export const DoodlePot = (p: D) => <Doodle {...p}><path d="M10 26h44l-2 22c-.5 6-4 10-10 10H22c-6 0-9.500-4-10-10z" /><path d="M6 31c2-2 4-3 5-5M58 31c-2-2-4-3-5-5" /><path d="M24 20c1-2 3-3 3-6M33 20c1-2 3-3 3-7M42 20c1-2 3-3 3-6" stroke={A} /></Doodle>;
export const DoodleTomato = (p: D) => <Doodle {...p}><path d="M12 38c0-12 9-20 20-20s20 8 20 20c0 11-9 18-20 18S12 49 12 38z" /><path d="M24 22l8 4 8-4M32 26l-1-9M28 19l4 7 5-7" stroke={A} /><path d="M20 38c1 4 3 7 7 9" strokeOpacity=".5" /></Doodle>;

export const DOODLES = [DoodleWhisk, DoodleLemon, DoodleChili, DoodleHerb, DoodleSpoon, DoodleGarlic, DoodlePot, DoodleTomato] as const;
