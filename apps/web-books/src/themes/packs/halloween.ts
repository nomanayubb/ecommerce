import type { Pack } from "../types";
export const pack: Pack = {
  id: "halloween", label: "Halloween",
  tokens: { brandColor: "#c2410c", brandColorDark: "#fb923c", defaultTheme: "dark" },
  announcement: "🎃 Spooky season sale: up to 30% off",
  decor: {
    particles: { items: ["🦇", "🎃", "🕸️", "👻"], count: 14, motion: "float", size: 22, opacity: 0.55 },
    corners: { topLeft: "🕸️", topRight: "🕸️", size: 64 },
    heroGradient: "linear-gradient(135deg,#1c1033,#7c2d12)",
  },
};
