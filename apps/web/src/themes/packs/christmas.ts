import type { Pack } from "../types";
export const pack: Pack = {
  id: "christmas", label: "Christmas / Winter",
  tokens: { brandColor: "#b91c1c", brandColorDark: "#f87171", defaultTheme: "light" },
  announcement: "🎄 Holiday deals are live",
  decor: {
    particles: { items: ["❄️", "❅", "❆"], count: 24, motion: "fall", size: 18, opacity: 0.7 },
    corners: { topLeft: "🎄", topRight: "🎁", size: 48 },
    heroGradient: "linear-gradient(135deg,#7f1d1d,#14532d)",
  },
};
