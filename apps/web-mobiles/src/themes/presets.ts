import type { Visuals } from "@/lib/api";
import type { Decor } from "./types";

/** Particle looks selectable in admin > Visual effects. A theme pack's own decor wins over these. */
export const PARTICLE_PRESETS: Record<Exclude<Visuals["particles"], "none">, NonNullable<Decor["particles"]>> = {
  herbs: { items: ["🌿", "🍃", "🌱"], count: 14, motion: "fall", size: 22, opacity: 0.45 },
  spices: { items: ["🌶️", "🧄", "🍋", "🍅"], count: 12, motion: "float", size: 20, opacity: 0.4 },
  flour: { items: ["•", "·", "∘"], count: 28, motion: "rise", size: 14, opacity: 0.22, tint: false },
  steam: { items: ["∿", "≀"], count: 10, motion: "rise", size: 40, opacity: 0.16, tint: false },
  sparkles: { items: ["✦", "✧", "·"], count: 16, motion: "float", size: 16, opacity: 0.5, tint: true },
  petals: { items: ["🌸", "🌺"], count: 12, motion: "fall", size: 20, opacity: 0.5 },
  snow: { items: ["❄", "❅", "·"], count: 22, motion: "fall", size: 16, opacity: 0.4, tint: false },
};
