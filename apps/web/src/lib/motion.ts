/** Client-side: are animations allowed right now? Mirrors the CSS rules (site setting, visitor switch, OS reduced-motion). */
export function motionAllowed(): boolean {
  if (typeof document === "undefined") return false;
  const d = document.documentElement.dataset;
  if (d.motion === "off" || d.motionPref === "off") return false;
  if (d.motionPref === "on") return true;
  return !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Tell the app to play a confetti burst (ignored when motion is off). */
export const fireConfetti = () => typeof window !== "undefined" && window.dispatchEvent(new Event("confetti"));

/** Make the mascot react (mood + optional speech bubble). */
export const mascotSay = (mood: string, text?: string) =>
  typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("mascot", { detail: { mood, text } }));

/** Fly a product thumbnail from the last click to the bag and bounce the bag icon (ignored when motion is off). */
export const flyToCart = (image?: string) =>
  typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("cart-fly", { detail: { image } }));
