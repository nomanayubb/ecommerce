import type { Branding } from "./api";

const FONTS: Record<Branding["font"], string> = {
  system: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: 'ui-rounded, "Nunito", "Segoe UI", sans-serif',
  mono: 'ui-monospace, "Cascadia Code", Consolas, monospace',
};

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** CSS custom properties for the saved branding. Values are validated hex/enum/int server-side; re-checked here. */
export function brandingCss(b: Branding): string {
  const ok = (h: string) => /^#[0-9a-fA-F]{6}$/.test(h);
  const light = ok(b.brandColor) ? b.brandColor : "#4f46e5";
  const dark = ok(b.brandColorDark) ? b.brandColorDark : "#818cf8";
  const radius = Math.min(28, Math.max(0, Math.round(Number(b.radius)) || 0));
  return (
    `html:root{--brand:${rgb(light)};--radius:${radius}px;--font:${FONTS[b.font] ?? FONTS.system}}` +
    `html[data-theme="dark"],html[data-theme="oled"]{--brand:${rgb(dark)}}`
  );
}
