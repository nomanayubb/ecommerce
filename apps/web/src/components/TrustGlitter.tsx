"use client";

import { useEffect, useRef } from "react";
import { motionAllowed } from "@/lib/motion";

/**
 * Gold aura on the theme background behind the trust strip (it spreads above and below the strip, under the strip's own sweep). A soft light enters at the upper left, winds down, up and down again in loops, and leaves at the
 * lower right, while real four-point glints appear around it at random places and fade. A few faint stars twinkle all the time.
 * Colours come from the theme's gold. One small canvas, paused while off screen or when the tab is hidden.
 */
const PERIOD = 10.5; // seconds for one pass including the pause
const TRAVEL = 7.2; // seconds the aura is on screen

type Star = { x: number; y: number; s: number; born: number; life: number; rot: number; hue: number };

export function TrustGlitter() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const rgb = () => (getComputedStyle(document.documentElement).getPropertyValue("--accent-bright").trim() || "212 170 70").split(/\s+/).map(Number);
    let [gr, gg, gb] = rgb();
    let W = 0, H = 0, dpr = 1, boxTop = 0, boxH = 0; // boxTop/boxH: where the strip itself sits inside this canvas
    const resize = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      const pr = cv.parentElement?.getBoundingClientRect();
      boxTop = pr ? pr.top - r.top : 0; boxH = pr ? pr.height : 0;
      cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      [gr, gg, gb] = rgb();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // Where the aura is at progress u (0 to 1): a wave of three turns with small loops around it.
    const at = (u: number) => {
      const e = u * u * (3 - 2 * u) * 0.35 + u * 0.65;
      const base = { x: -0.04 * W + e * 1.08 * W, y: H * (0.5 - 0.42 * Math.cos(2 * Math.PI * 1.5 * e)) };
      const loop = Math.sin(Math.PI * u) * Math.min(H, 260) * 0.2;
      const a = 2 * Math.PI * 4.5 * u;
      return { x: base.x + loop * Math.cos(a) * 1.4, y: base.y + loop * Math.sin(a) };
    };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const stars: Star[] = [];
    const ambient: Star[] = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), s: rand(3.5, 8), born: rand(0, 6), life: rand(3.2, 5.5), rot: rand(-0.3, 0.3), hue: Math.random() }));

    /** A four-point glint: long soft spikes, a smaller one at 45 degrees and a bright core. */
    const glint = (x: number, y: number, s: number, alpha: number, rot: number, warm: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.9);
      core.addColorStop(0, `rgba(255,248,225,${0.95})`);
      core.addColorStop(0.25, `rgba(${gr},${gg},${gb},${0.55})`);
      core.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0, 7); ctx.fill();
      const spike = (len: number, wid: number, a: number) => {
        const g = ctx.createLinearGradient(-len, 0, len, 0);
        g.addColorStop(0, `rgba(${gr},${gg},${gb},0)`);
        g.addColorStop(0.5, warm > 0.5 ? `rgba(255,246,214,${a})` : `rgba(255,255,255,${a})`);
        g.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-len, 0); ctx.quadraticCurveTo(-len * 0.08, -wid, 0, -wid * 0.12); ctx.quadraticCurveTo(len * 0.08, -wid, len, 0);
        ctx.quadraticCurveTo(len * 0.08, wid, 0, wid * 0.12); ctx.quadraticCurveTo(-len * 0.08, wid, -len, 0); ctx.fill();
      };
      spike(s * 2.7, s * 0.2, 1);
      ctx.rotate(Math.PI / 2); spike(s * 2.7, s * 0.2, 1);
      ctx.rotate(Math.PI / 4); spike(s * 1.3, s * 0.13, 0.7);
      ctx.rotate(Math.PI / 2); spike(s * 1.3, s * 0.13, 0.7);
      ctx.restore();
    };

    let raf = 0, visible = true, last = 0, spawnDebt = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const t = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      const ph = t % PERIOD;
      const moving = ph < TRAVEL;
      const u = Math.min(1, ph / TRAVEL);
      const fade = moving ? Math.min(1, u * 8, (1 - u) * 8) : 0;

      if (moving) {
        // Aura: the head and a soft trail behind it.
        const R = Math.max(110, Math.min(H * 0.62, 190));
        for (let k = 14; k >= 0; k--) {
          const p = at(Math.max(0, u - k * 0.012));
          const a = (1 - k / 15) * 0.28 * fade;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * (1 - k * 0.025));
          g.addColorStop(0, `rgba(255,236,170,${a * 1.25})`);
          g.addColorStop(0.35, `rgba(${gr},${gg},${gb},${a})`);
          g.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2);
        }
        // Glints appear around the aura at random places.
        spawnDebt += dt * 26;
        while (spawnDebt >= 1) {
          spawnDebt -= 1;
          const p = at(Math.max(0, u - rand(0, 0.07)));
          const ang = rand(0, 7), dist = rand(0.05, 1) * R * 0.85;
          stars.push({ x: p.x + Math.cos(ang) * dist * 1.5, y: p.y + Math.sin(ang) * dist * 0.7, s: rand(7, 16), born: t, life: rand(0.8, 1.7), rot: rand(-0.4, 0.4), hue: Math.random() });
        }
      }

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        const k = (t - s.born) / s.life;
        if (k >= 1) { stars.splice(i, 1); continue; }
        const env = Math.sin(Math.PI * k);
        glint(s.x, s.y, s.s * (0.55 + 0.45 * env), env, s.rot + k * 0.5, s.hue);
      }
      for (const s of ambient) {
        const k = ((t - s.born) % s.life) / s.life;
        if (k < 0) continue;
        glint(s.x * W, s.y * H, s.s, 0.5 * Math.sin(Math.PI * k) ** 2, s.rot, s.hue);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, boxTop, W, boxH); // nothing is drawn inside the strip: the aura lives on the page background around it
    };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(cv);
    if (motionAllowed()) raf = requestAnimationFrame(frame);
    else { // motion is off: a few still glints, no movement
      for (const s of ambient) glint(s.x * W, s.y * H, s.s * 1.2, 0.5, s.rot, s.hue);
      ctx.clearRect(0, boxTop, W, boxH);
    }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute -top-24 -bottom-24 left-0 right-0 -z-10 h-[calc(100%+12rem)] w-full" />;
}
