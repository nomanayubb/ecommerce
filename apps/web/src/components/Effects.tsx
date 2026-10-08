"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_EFFECTS, type Effects } from "@/lib/api";
import { motionAllowed } from "@/lib/motion";
import { ArrowRightIcon, CloseIcon } from "./icons";
import { MascotFigure } from "./Mascot";
import { NewsletterForm } from "./NewsletterForm";

const KEY_COOKIE = "cookie-ok";
const KEY_POPUP = "nl-popup";
const DAY = 86_400_000;

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

/** Click ripple, fly-to-bag, back-to-top, cookie notice and newsletter popup. Each one is a switch in admin Settings. */
export function EffectsHost({ effects, brandName }: { effects?: Partial<Effects>; brandName: string }) {
  const fx = { ...DEFAULT_EFFECTS, ...effects };
  const last = useRef({ x: 0, y: 0 });

  // Ripple on .btn, and remember where the last press was (the bag animation starts there).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      last.current = { x: e.clientX, y: e.clientY };
      if (!fx.ripple || !motionAllowed()) return;
      const btn = (e.target as HTMLElement | null)?.closest?.(".btn") as HTMLElement | null;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const dot = document.createElement("span");
      dot.className = "ripple";
      dot.setAttribute("aria-hidden", "true");
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      btn.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove(), { once: true });
      setTimeout(() => dot.remove(), 900);
    };
    addEventListener("pointerdown", onDown, { capture: true, passive: true });
    return () => removeEventListener("pointerdown", onDown, { capture: true });
  }, [fx.ripple]);

  // Fly a thumbnail to the bag, then bounce the bag.
  useEffect(() => {
    const onFly = (e: Event) => {
      if (!fx.flyToCart || !motionAllowed()) return;
      const bag = document.querySelector("[data-bag]") as HTMLElement | null;
      if (!bag) return;
      const to = bag.getBoundingClientRect();
      const bounce = () => bag.animate([{ transform: "scale(1)" }, { transform: "scale(1.28)" }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(.3,1.6,.5,1)" });
      const src = (e as CustomEvent<{ image?: string }>).detail?.image;
      if (!src) return bounce();
      const size = 72;
      const { x, y } = last.current.x || last.current.y ? last.current : { x: innerWidth / 2, y: innerHeight / 2 };
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.style.cssText = `position:fixed;z-index:95;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;object-fit:cover;pointer-events:none;border-radius:var(--radius);box-shadow:0 10px 30px rgb(0 0 0 / .35)`;
      document.body.appendChild(img);
      const dx = to.left + to.width / 2 - x;
      const dy = to.top + to.height / 2 - y;
      const a = img.animate(
        [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(.7)`, opacity: 0.95, offset: 0.55 }, { transform: `translate(${dx}px, ${dy}px) scale(.18)`, opacity: 0.3 }],
        { duration: 700, easing: "cubic-bezier(.5,0,.75,.5)" },
      );
      a.onfinish = () => { img.remove(); bounce(); };
      a.oncancel = () => img.remove();
      setTimeout(() => img.remove(), 1500); // hidden tabs pause animations; never leave the clone behind
    };
    addEventListener("cart-fly", onFly);
    return () => removeEventListener("cart-fly", onFly);
  }, [fx.flyToCart]);

  return (
    <>
      {fx.backToTop && <BackToTop />}
      {fx.cookieNotice && <CookieNotice brandName={brandName} />}
      {fx.newsletterPopup && <NewsletterPopup brandName={brandName} />}
    </>
  );
}

/** Round button that shows page progress as a ring and scrolls to the top. */
function BackToTop() {
  const [p, setP] = useState(0);
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement.scrollHeight - innerHeight;
      setP(h > 0 ? Math.min(1, scrollY / h) : 0);
      setShow(scrollY > 700);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener("scroll", on, { passive: true });
    update();
    return () => { removeEventListener("scroll", on); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const C = 2 * Math.PI * 20;
  return (
    <button
      type="button" aria-label="Back to top" tabIndex={show ? 0 : -1}
      onClick={() => scrollTo({ top: 0, behavior: motionAllowed() ? "smooth" : "auto" })}
      className={`btt glass fixed bottom-24 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full transition duration-300 hover:text-accent md:bottom-6 md:left-5 ${show ? "" : "pointer-events-none translate-y-4 opacity-0"}`}
    >
      <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="2" />
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgb(var(--accent))" strokeWidth="2" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
      </svg>
      <ArrowRightIcon size={18} className="-rotate-90" />
    </button>
  );
}

/** Short, honest notice: the shop only uses cookies it needs (bag, sign-in, theme). */
function CookieNotice({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (read(KEY_COOKIE)) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (open) document.body.dataset.cookie = "1"; else delete document.body.dataset.cookie;
    return () => { delete document.body.dataset.cookie; };
  }, [open]);
  if (!open) return null;
  return (
    <div role="region" aria-label="Cookies" className="fade-up fixed bottom-[5.5rem] left-1/2 z-[60] flex w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 border border-line bg-card p-3 shadow-2xl md:bottom-4">
      <MascotFigure mood="happy" size={44} className="hidden shrink-0 sm:block" />
      <p className="flex-1 text-xs leading-5 text-muted">
        {brandName} only uses the small files it needs to remember your bag, your sign-in and your theme. No tracking.
      </p>
      <button className="btn btn-primary !px-4 !py-2" onClick={() => { write(KEY_COOKIE, "1"); setOpen(false); }}>Got it</button>
    </div>
  );
}

/** Shown once per 14 days: after 30 s on the page or when the mouse leaves through the top (desktop). */
function NewsletterPopup({ brandName }: { brandName: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const blocked = /^\/(checkout|account|login|register|preview)/.test(path);
  useEffect(() => {
    if (blocked) return;
    const seen = Number(read(KEY_POPUP) ?? 0);
    if (seen && Date.now() - seen < 14 * DAY) return;
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 0) show(); };
    const t = setTimeout(() => show(), 30_000);
    function cleanup() { clearTimeout(t); document.removeEventListener("mouseleave", onLeave); }
    function show() { write(KEY_POPUP, String(Date.now())); setOpen(true); cleanup(); }
    if (matchMedia("(pointer: fine)").matches) document.addEventListener("mouseleave", onLeave);
    return cleanup;
  }, [blocked]);
  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label={`Join ${brandName}`} className="fade-up relative w-full max-w-md border border-line bg-card p-8 text-center" onClick={(e) => e.stopPropagation()}>
        <button ref={closeBtn} aria-label="Close" onClick={() => setOpen(false)} className="absolute right-3 top-3 p-2 transition hover:text-accent"><CloseIcon size={18} /></button>
        <MascotFigure mood="wave" size={72} className="mx-auto" />
        <p className="eyebrow mt-3">Welcome</p>
        <h2 className="mt-2 text-2xl font-semibold">Be first to know</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">New arrivals and quiet offers from {brandName}. No spam, leave any time.</p>
        <div className="mx-auto text-left"><NewsletterForm /></div>
      </div>
    </div>
  );
}
