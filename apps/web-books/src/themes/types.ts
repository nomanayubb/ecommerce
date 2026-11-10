/** A theme pack = one occasion/look. Pure data, so another project can drop in or delete packs freely. */
export interface Decor {
  /** Floating emoji/glyph particles. */
  particles?: { items: string[]; count: number; motion: "fall" | "rise" | "float"; size?: number; opacity?: number; tint?: boolean };
  /** Glyphs pinned to viewport corners. */
  corners?: { topLeft?: string; topRight?: string; bottomLeft?: string; bottomRight?: string; size?: number };
  /** CSS gradient painted behind the home hero. */
  heroGradient?: string;
}

export interface Pack {
  id: string;
  label: string;
  /** Overrides the saved brand colors / default theme while the pack is active. */
  tokens?: { brandColor?: string; brandColorDark?: string; defaultTheme?: "light" | "dark" | "oled"; radius?: number };
  /** Used only when the admin left the announcement empty. */
  announcement?: string;
  decor?: Decor;
}
