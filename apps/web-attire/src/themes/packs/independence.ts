import type { Pack } from "../types";
export const pack: Pack = {
  id: "independence", label: "Independence Day (14 Aug)",
  tokens: { brandColor: "#01411c", brandColorDark: "#22c55e", defaultTheme: "light" },
  announcement: "🇵🇰 Happy Independence Day: special green deals",
  decor: {
    particles: { items: ["🇵🇰", "🌙", "⭐"], count: 14, motion: "rise", size: 22, opacity: 0.6 },
    heroGradient: "linear-gradient(135deg,#01411c,#166534)",
  },
};
