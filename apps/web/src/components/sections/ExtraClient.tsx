"use client";

import { useEffect, useRef, useState } from "react";
import { send } from "@/lib/client";
import { motionAllowed } from "@/lib/motion";

export type Place = { name: string; address: string; lat: number; lng: number; href?: string; phone?: string };

/** "31.52, 74.35" -> [31.52, 74.35] (null if it is not a real position). */
export function parseCoords(s: string): [number, number] | null {
  const m = String(s).replace(/[()]/g, "").split(/[,;\s]+/).filter(Boolean).map(Number);
  return m.length >= 2 && m.every(Number.isFinite) && Math.abs(m[0]) <= 90 && Math.abs(m[1]) <= 180 ? [m[0], m[1]] : null;
}

/** OpenStreetMap map (no key needed). Loads the map library only when the map scrolls into view. */
export function LeafletMap({ places, className = "" }: { places: Place[]; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const flyTo = useRef<(i: number) => void>(() => {});
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || !places.length) return;
    let map: { remove: () => void } | null = null;
    let disposed = false;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (disposed || !host.current) return;
      const m = L.map(host.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
      map = m;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(m);
      const icon = L.divIcon({ className: "", html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:rgb(var(--accent));border:3px solid #fff;box-shadow:0 2px 8px rgb(0 0 0/.5)"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
      const markers = places.map((p, i) => {
        const mk = L.marker([p.lat, p.lng], { icon, title: p.name, alt: p.name, keyboard: true }).addTo(m);
        mk.bindPopup(`<strong></strong>`).on("click", () => setActive(i));
        const strong = document.createElement("div");
        const b = document.createElement("strong"); b.textContent = p.name; strong.appendChild(b);
        if (p.address) { const a = document.createElement("div"); a.textContent = p.address; a.style.marginTop = "4px"; strong.appendChild(a); }
        mk.setPopupContent(strong);
        return mk;
      });
      if (places.length === 1) m.setView([places[0].lat, places[0].lng], 14);
      else m.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40] });
      flyTo.current = (i) => { m.flyTo([places[i].lat, places[i].lng], 14, { animate: motionAllowed() }); markers[i].openPopup(); setActive(i); };
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => { disposed = true; io.disconnect(); map?.remove(); };
  }, [places]);

  return (
    <div>
      <div ref={host} role="region" aria-label="Map" className={`z-0 h-80 w-full border border-line bg-card ${className}`} />
      {places.length > 1 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {places.map((p, i) => (
            <li key={i}><button type="button" onClick={() => flyTo.current(i)} className={`w-full border px-4 py-3 text-left text-sm transition hover:border-accent ${active === i ? "border-accent" : "border-line"}`}><span className="font-medium">{p.name}</span>{p.address && <span className="mt-0.5 block text-xs text-muted">{p.address}</span>}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Message form: lands in admin > Messages. Has a hidden honeypot field that real people never fill. */
export function ContactForm() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const field = "w-full border border-line bg-card px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent";
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setState("busy");
        try {
          const r = await send<{ message: string }>("POST", "contact", { name: f.get("name"), email: f.get("email"), phone: f.get("phone") || undefined, message: f.get("message"), website: f.get("website") || undefined });
          setState("done"); setMsg(r.message);
          (e.target as HTMLFormElement).reset();
        } catch (err) { setState("error"); setMsg(err instanceof Error ? err.message : "Could not send"); }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">Name</span><input name="name" required maxLength={100} autoComplete="name" className={field} /></label>
        <label><span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">Email</span><input name="email" type="email" required autoComplete="email" className={field} /></label>
      </div>
      <label className="block"><span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">Phone (optional)</span><input name="phone" type="tel" autoComplete="tel" className={field} /></label>
      <label className="block"><span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">Message</span><textarea name="message" required minLength={5} maxLength={3000} rows={5} className={field} /></label>
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button disabled={state === "busy"} className="btn btn-primary disabled:opacity-50">{state === "busy" ? "Sending…" : "Send message"}</button>
      {msg && <p role="status" className={`text-sm ${state === "error" ? "text-red-400" : "text-accent"}`}>{msg}</p>}
    </form>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Live countdown to a date. */
export function Countdown({ to, className = "" }: { to: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (now == null) return <span className={className}>&nbsp;</span>;
  const s = Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return (
    <span className={`inline-flex gap-4 font-mono ${className}`} role="timer" aria-label={`${d} days ${h} hours ${m} minutes left`}>
      {[[d, "days"], [h, "hours"], [m, "min"], [s % 60, "sec"]].map(([v, l]) => <span key={l as string} className="text-center"><span className="block text-3xl font-semibold">{pad(v as number)}</span><span className="text-[0.6rem] uppercase tracking-widest text-muted">{l}</span></span>)}
    </span>
  );
}

/** A number that counts up once when it scrolls into view, with an optional progress bar. */
export function StatCounter({ value, prefix = "", suffix = "", label, progress = 0 }: { value: number; prefix?: string; suffix?: string; label: string; progress?: number }) {
  const [shown, setShown] = useState(value);
  const [fill, setFill] = useState(progress);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !motionAllowed()) return;
    setShown(0); setFill(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400), ease = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(value * ease)); setFill(progress * ease);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [value, progress]);
  return (
    <div ref={ref} className="border border-line bg-card p-6">
      <p className="text-4xl font-semibold text-accent">{prefix}{shown.toLocaleString("en-PK")}{suffix}</p>
      <p className="mt-2 text-sm text-muted">{label}</p>
      {progress > 0 && <div className="mt-4 h-1.5 bg-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={label}><div className="h-full bg-accent" style={{ width: `${fill}%` }} /></div>}
    </div>
  );
}
