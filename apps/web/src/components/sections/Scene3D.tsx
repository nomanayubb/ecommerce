"use client";

import { useEffect, useRef, useState } from "react";
import { motionAllowed } from "@/lib/motion";

/** "r g b" CSS variable -> THREE colour int. */
const cssColor = (name: string, fallback: number) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/\s+/).map(Number);
  return v.length >= 3 && v.every((n) => Number.isFinite(n)) ? (v[0] << 16) | (v[1] << 8) | v[2] : fallback;
};

/**
 * A small interactive 3D scene: a copper pot with a floating lid and ingredients orbiting it.
 * Built from plain three.js shapes (no model files). The camera drifts with the pointer; the scene pauses when
 * off screen or when motion is not allowed (then it shows one still frame). three.js loads only when this mounts.
 */
export function Scene3D({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
      catch { setFailed(true); return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
      camera.position.set(0, 2.2, 7.2);

      const accent = cssColor("--accent-bright", 0xd4aa46);
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(4, 6, 5); scene.add(key);
      const rim = new THREE.PointLight(accent, 30, 18); rim.position.set(-4, 2, -2); scene.add(rim);

      const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.92, roughness: 0.32 });
      const inner = new THREE.MeshStandardMaterial({ color: 0x5a2f14, metalness: 0.6, roughness: 0.6, side: THREE.BackSide });
      const group = new THREE.Group();
      scene.add(group);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.95, 1.3, 56, 1, true), copper);
      const bodyIn = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.95, 1.3, 56, 1, true), inner);
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.95, 56), copper); bottom.rotation.x = Math.PI / 2; bottom.position.y = -0.65;
      const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.05, 16, 64), copper); rimRing.rotation.x = Math.PI / 2; rimRing.position.y = 0.65;
      group.add(body, bodyIn, bottom, rimRing);
      for (const s of [-1, 1]) {
        const h = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 12, 28), copper);
        h.position.set(s * 1.25, 0.3, 0); h.rotation.y = Math.PI / 2; h.scale.set(1, 0.9, 1); group.add(h);
      }
      const lid = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.12, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2.6), copper);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), new THREE.MeshStandardMaterial({ color: accent, metalness: 0.8, roughness: 0.25 }));
      knob.position.y = 0.98 * 0.62 + 0.3;
      lid.add(dome, knob); lid.position.y = 1.7; group.add(lid);

      // Ingredients that orbit the pot.
      const mats = {
        tomato: new THREE.MeshStandardMaterial({ color: 0xc8321f, roughness: 0.45 }),
        lemon: new THREE.MeshStandardMaterial({ color: 0xe8c02a, roughness: 0.5 }),
        leaf: new THREE.MeshStandardMaterial({ color: 0x4f8a3c, roughness: 0.6 }),
        chili: new THREE.MeshStandardMaterial({ color: 0xd2381a, roughness: 0.4 }),
      };
      const orbit: { m: InstanceType<typeof THREE.Mesh>; r: number; sp: number; ph: number; y: number }[] = [];
      const mesh = (g: ConstructorParameters<typeof THREE.Mesh>[0], m: ConstructorParameters<typeof THREE.Mesh>[1], sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(g, m); o.scale.set(sx, sy, sz); return o; };
      const add = (m: InstanceType<typeof THREE.Mesh>, r: number, sp: number, ph: number, y: number) => { scene.add(m); orbit.push({ m, r, sp, ph, y }); };
      add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), mats.tomato), 2.3, 0.5, 0, 0.6);
      add(mesh(new THREE.SphereGeometry(0.3, 28, 20), mats.lemon, 1.25, 1, 1), 2.6, -0.4, 2, 1.4);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), mats.tomato), 2.0, 0.65, 4, 2.1);
      for (let i = 0; i < 4; i++) add(mesh(new THREE.SphereGeometry(0.2, 16, 12), mats.leaf, 1.8, 0.3, 1), 1.9 + i * 0.25, 0.3 + i * 0.12, i * 1.6, 0.2 + i * 0.7);
      add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 14), mats.chili), 2.8, 0.42, 1, 1.0);

      const size = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.x = w / h < 0.9 ? 0 : -0.2;
        camera.updateProjectionMatrix();
      };
      size();
      const ro = new ResizeObserver(size); ro.observe(el);

      let px = 0, py = 0, tx = 0, ty = 0;
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      addEventListener("pointermove", onMove, { passive: true });

      let raf = 0, visible = true;
      const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf && animate) tick(); });
      io.observe(el);
      const animate = motionAllowed();
      const clock = new THREE.Clock();
      const frame = () => {
        const t = clock.getElapsedTime();
        px += (tx - px) * 0.05; py += (ty - py) * 0.05;
        camera.position.x = (camera.aspect < 0.9 ? 0 : -0.2) + px * 0.8;
        camera.position.y = 2.2 - py * 0.5;
        camera.lookAt(0, 0.9, 0);
        group.rotation.y = t * 0.25;
        lid.position.y = 1.7 + Math.sin(t * 1.4) * 0.12; lid.rotation.y = t * 0.6; lid.rotation.z = Math.sin(t) * 0.05;
        for (const o of orbit) {
          const a = o.ph + t * o.sp;
          o.m.position.set(Math.cos(a) * o.r, o.y + Math.sin(t * 1.3 + o.ph) * 0.15, Math.sin(a) * o.r);
          o.m.rotation.y = a; o.m.rotation.z = Math.sin(t + o.ph) * 0.6;
        }
        renderer.render(scene, camera);
      };
      const tick = () => {
        raf = 0;
        if (!visible || disposed || document.hidden) { raf = 0; if (!document.hidden && visible) raf = requestAnimationFrame(tick); return; }
        frame();
        raf = requestAnimationFrame(tick);
      };
      frame();
      // Health signal for tests: how many sample pixels of the first frame are painted.
      const gl = renderer.getContext(); const pix = new Uint8Array(4); let hits = 0;
      for (const [fx, fy] of [[0.5, 0.5], [0.42, 0.45], [0.58, 0.45], [0.5, 0.35], [0.5, 0.62], [0.35, 0.55], [0.65, 0.55]]) {
        gl.readPixels(Math.floor(gl.drawingBufferWidth * fx), Math.floor(gl.drawingBufferHeight * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
        if (pix[3] > 0) hits++;
      }
      el.dataset.rendered = String(hits);
      if (animate) tick();

      cleanup = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener("pointermove", onMove);
        scene.traverse((o) => { const m = o as InstanceType<typeof THREE.Mesh>; if (m.geometry) m.geometry.dispose(); });
        Object.values(mats).forEach((m) => m.dispose()); copper.dispose(); inner.dispose();
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => setFailed(true));

    return () => { disposed = true; cleanup(); };
  }, []);

  if (failed) return null;
  return <div ref={host} className={`pointer-events-none ${className}`} />;
}
