"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Branding {
  name: string; tagline: string; logoUrl: string; logoUrlDark: string; brandColor: string; brandColorDark: string; accentColor: string;
  radius: number; font: "system" | "serif" | "rounded" | "mono"; defaultTheme: "light" | "dark" | "oled"; announcement: string; pack: string; motion: "off" | "subtle" | "full";
  inkColor: string; creamColor: string; darkColor: string; heroText: string; promiseText: string; footerText: string;
}

// Keep in sync with apps/web/src/themes/index.ts
interface Store { freeShippingThreshold: number; shippingFee: number }

const PACKS = [["default", "Default (no decoration)"], ["halloween", "Halloween"], ["eid", "Eid / Ramadan"], ["christmas", "Christmas / Winter"], ["blackfriday", "Black Friday / Mega Sale"], ["independence", "Independence Day"]];

export default function Settings() {
  const [b, setB] = useState<Branding | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api<{ branding: Branding; store: Store }>("/settings").then((r) => { setB(r.branding); setStore(r.store); }).catch((e) => setMsg(e.message)); }, []);
  if (!b || !store) return <p className="text-muted">{msg || "Loading…"}</p>;

  const set = <K extends keyof Branding>(k: K, v: Branding[K]) => setB({ ...b, [k]: v });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/admin/settings", { method: "PUT", body: JSON.stringify(b) });
      await api("/admin/store-settings", { method: "PUT", body: JSON.stringify(store) });
      setMsg("Saved. The storefront updates within about 30 seconds.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  const input = "w-full rounded border border-line bg-card px-3 py-2";
  const label = "block text-sm text-muted";
  return (
    <form onSubmit={save} className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Brand & theme</h1>
      <label className={label}>Store name<input className={input} value={b.name} onChange={(e) => set("name", e.target.value)} required /></label>
      <label className={label}>Tagline<input className={input} value={b.tagline} onChange={(e) => set("tagline", e.target.value)} /></label>
      <label className={label}>Logo URL (http(s) or /path, empty = show name)
        <input className={input} value={b.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
      </label>
      {b.logoUrl && <img src={b.logoUrl} alt="Logo preview" className="h-12 w-auto rounded border border-line bg-[#faf6ee] p-2" />}
      <label className={label}>Logo for dark backgrounds (optional)
        <input className={input} value={b.logoUrlDark ?? ""} onChange={(e) => set("logoUrlDark", e.target.value)} />
      </label>
      {b.logoUrlDark && <img src={b.logoUrlDark} alt="Dark logo preview" className="h-12 w-auto rounded border border-line bg-[#0f0f11] p-2" />}
      <label className={label}>Accent color (gold highlights)
        <input type="color" className="h-10 w-full rounded border border-line bg-card" value={b.accentColor ?? "#b88c2c"} onChange={(e) => set("accentColor", e.target.value)} />
      </label>
      <label className={label}>Occasion theme pack (overrides colors while active)
        <select className={input} value={b.pack ?? "default"} onChange={(e) => set("pack", e.target.value)}>
          {PACKS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className={label}>Brand color (light)
          <input type="color" className="h-10 w-full rounded border border-line bg-card" value={b.brandColor} onChange={(e) => set("brandColor", e.target.value)} />
        </label>
        <label className={label}>Brand color (dark / OLED)
          <input type="color" className="h-10 w-full rounded border border-line bg-card" value={b.brandColorDark} onChange={(e) => set("brandColorDark", e.target.value)} />
        </label>
      </div>
      <label className={label}>Corner radius: {b.radius}px
        <input type="range" min={0} max={28} value={b.radius} onChange={(e) => set("radius", Number(e.target.value))} className="w-full" />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className={label}>Font
          <select className={input} value={b.font} onChange={(e) => set("font", e.target.value as Branding["font"])}>
            <option value="system">Modern (system)</option><option value="serif">Elegant (serif)</option>
            <option value="rounded">Friendly (rounded)</option><option value="mono">Technical (mono)</option>
          </select>
        </label>
        <label className={label}>Default theme
          <select className={input} value={b.defaultTheme} onChange={(e) => set("defaultTheme", e.target.value as Branding["defaultTheme"])}>
            <option value="light">Light</option><option value="dark">Dark</option><option value="oled">OLED</option>
          </select>
        </label>
      </div>
      <fieldset className="space-y-4 border border-line p-4">
        <legend className="px-2 text-xs uppercase tracking-widest text-muted">Palette (every colour is generated from these)</legend>
        <div className="grid grid-cols-3 gap-4">
          <label className={label}>Ink (text, light mode)
            <input type="color" className="h-10 w-full rounded border border-line bg-card" value={b.inkColor ?? "#1e1e20"} onChange={(e) => set("inkColor", e.target.value)} />
          </label>
          <label className={label}>Cream (light page)
            <input type="color" className="h-10 w-full rounded border border-line bg-card" value={b.creamColor ?? "#faf6ee"} onChange={(e) => set("creamColor", e.target.value)} />
          </label>
          <label className={label}>Charcoal (dark page, hero)
            <input type="color" className="h-10 w-full rounded border border-line bg-card" value={b.darkColor ?? "#0f0f11"} onChange={(e) => set("darkColor", e.target.value)} />
          </label>
        </div>
      </fieldset>
      <fieldset className="space-y-4 border border-line p-4">
        <legend className="px-2 text-xs uppercase tracking-widest text-muted">Copy</legend>
        <label className={label}>Hero text<textarea rows={2} className={input} value={b.heroText ?? ""} onChange={(e) => set("heroText", e.target.value)} /></label>
        <label className={label}>Brand promise<textarea rows={2} className={input} value={b.promiseText ?? ""} onChange={(e) => set("promiseText", e.target.value)} /></label>
        <label className={label}>Footer text<textarea rows={2} className={input} value={b.footerText ?? ""} onChange={(e) => set("footerText", e.target.value)} /></label>
      </fieldset>
      <fieldset className="space-y-4 border border-line p-4">
        <legend className="px-2 text-xs uppercase tracking-widest text-muted">Delivery rules (used at checkout)</legend>
        <div className="grid grid-cols-2 gap-4">
          <label className={label}>Free delivery over (0 = always free)
            <input type="number" min={0} className={input} value={store.freeShippingThreshold} onChange={(e) => setStore({ ...store, freeShippingThreshold: Number(e.target.value) })} />
          </label>
          <label className={label}>Flat delivery fee
            <input type="number" min={0} className={input} value={store.shippingFee} onChange={(e) => setStore({ ...store, shippingFee: Number(e.target.value) })} />
          </label>
        </div>
      </fieldset>
      <label className={label}>Animation intensity
        <select className={input} value={b.motion ?? "full"} onChange={(e) => set("motion", e.target.value as Branding["motion"])}>
          <option value="full">Full (reveals, tilt, animated hero)</option>
          <option value="subtle">Subtle (reveals only)</option>
          <option value="off">Off (no motion)</option>
        </select>
      </label>
      <label className={label}>Announcement bar (empty = hidden)
        <input className={input} value={b.announcement} onChange={(e) => set("announcement", e.target.value)} />
      </label>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <button className="rounded bg-brand px-6 py-2 font-medium text-onbrand">Save</button>
    </form>
  );
}
