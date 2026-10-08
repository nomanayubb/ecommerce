"use client";

import { useEffect, useRef, useState } from "react";
import { pkr } from "@/lib/api";
import { motionAllowed } from "@/lib/motion";
import { useSite } from "./Site";

/** Tints a product card's glow with the dominant colour of its photo on first hover (needs a same-origin or CORS image). */
export function CardGlow({ image }: { image?: string }) {
  const on = !!useSite().branding.visuals?.cardGlow;
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const card = ref.current?.closest(".pcard") as HTMLElement | null;
    if (!on || !card || !image) return;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = c.height = 8;
          const x = c.getContext("2d", { willReadFrequently: true })!;
          x.drawImage(img, 0, 0, 8, 8);
          const d = x.getImageData(0, 0, 8, 8).data;
          let r = 0, g = 0, b = 0, w = 0;
          for (let i = 0; i < d.length; i += 4) {
            const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) + 20; // favour colourful pixels
            r += d[i] * sat; g += d[i + 1] * sat; b += d[i + 2] * sat; w += sat;
          }
          card.style.setProperty("--glow", `${Math.round(r / w)} ${Math.round(g / w)} ${Math.round(b / w)}`);
          card.dataset.glow = "1";
        } catch { /* tainted canvas: skip */ }
      };
      img.src = image;
    };
    card.addEventListener("pointerenter", run, { once: true });
    return () => card.removeEventListener("pointerenter", run);
  }, [on, image]);
  return <span ref={ref} hidden />;
}

/** Price that counts up once when the card scrolls into view (only if the store enabled it). */
export function PriceTag({ value, className = "" }: { value: number; className?: string }) {
  const on = !!useSite().branding.visuals?.priceCountUp;
  const [shown, setShown] = useState(value);
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!on || !el.current || !motionAllowed()) return;
    const node = el.current;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), from = value * 0.55;
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / 700);
        setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step); else setShown(value);
      };
      setShown(Math.round(from));
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(node);
    return () => io.disconnect();
  }, [on, value]);
  return <span ref={el} className={className}>{pkr(shown)}</span>;
}
