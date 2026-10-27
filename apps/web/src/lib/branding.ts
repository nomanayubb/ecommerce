import type { Branding } from "./api";

const FONTS: Record<Branding["font"], string> = {
  system: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: 'ui-rounded, "Nunito", "Segoe UI", sans-serif',
  mono: 'ui-monospace, "Cascadia Code", Consolas, monospace',
};

type RGB = [number, number, number];
const isHex = (h: unknown): h is string => typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h);
const toRgb = (hex: string): RGB => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const str = (c: RGB) => c.map((v) => Math.round(v)).join(" ");
/** mix(a, b, t): t=0 -> a, t=1 -> b */
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const luminance = ([r, g, b]: RGB) => {
  const c = [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/** Readable text colour on a given background: near-black on light, white on dark. */
const onColor = (c: RGB) => (luminance(c) > 0.4 ? "18 18 20" : "255 255 255");

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

/**
 * Every colour token is derived from the brand palette (ink, cream, charcoal, brand/accent golds),
 * so rebranding = changing those few values. Inputs are validated server-side and re-checked here.
 */
export function brandingCss(b: Branding): string {
  const pick = (v: unknown, d: string) => toRgb(isHex(v) ? v : d);
  const ink = pick(b.inkColor, "#1e1e20");
  const cream = pick(b.creamColor, "#faf6ee");
  const dark = pick(b.darkColor, "#0f0f11");
  const brandLight = pick(b.brandColor, "#1c1c1e");
  const brandDark = pick(b.brandColorDark, "#d4aa46");
  const accentLight = pick(b.accentColor, "#b88c2c");
  const radius = Math.min(28, Math.max(0, Math.round(Number(b.radius)) || 0));
  const font = FONTS[b.font] ?? FONTS.system;
  const heading = b.headingFont && b.headingFont !== "inherit" ? FONTS[b.headingFont] ?? font : "var(--font)";
  const maxw = { boxed: "80rem", wide: "100rem", full: "100%" }[b.layoutWidth ?? "boxed"] ?? "80rem";

  const light =
    `--bg:${str(cream)};--fg:${str(ink)};--muted:${str(mix(ink, cream, 0.38))};--card:${str(mix(cream, WHITE, 0.55))};--line:${str(mix(cream, ink, 0.12))};` +
    `--brand:${str(brandLight)};--on-brand:${onColor(brandLight)};--accent:${str(accentLight)};`;
  const darkTheme = (bg: RGB) =>
    `--bg:${str(bg)};--fg:${str(cream)};--muted:${str(mix(bg, cream, 0.62))};--card:${str(mix(bg, cream, 0.06))};--line:${str(mix(bg, cream, 0.14))};` +
    `--brand:${str(brandDark)};--on-brand:${onColor(brandDark)};--accent:${str(brandDark)};`;

  return (
    `html:root{${light}--dark:${str(dark)};--on-dark:${str(cream)};--accent-bright:${str(brandDark)};--radius:${radius}px;--font:${font};--font-heading:${heading};--maxw:${maxw}}` +
    `html[data-theme="dark"]{${darkTheme(dark)}}` +
    `html[data-theme="oled"]{${darkTheme(BLACK)}}`
  );
}
