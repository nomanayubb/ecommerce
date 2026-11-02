import type { Pack } from "../types";
export const pack: Pack = {
  id: "eid", label: "Eid / Ramadan",
  tokens: { brandColor: "#047857", brandColorDark: "#34d399", defaultTheme: "light", radius: 14 },
  announcement: "🌙 Eid Mubarak! Free delivery on every order",
  decor: {
    particles: { items: ["🌙", "⭐", "✨"], count: 12, motion: "float", size: 20, opacity: 0.5 },
    corners: { topRight: "🌙", size: 56 },
    heroGradient: "linear-gradient(135deg,#064e3b,#ca8a04)",
  },
};
