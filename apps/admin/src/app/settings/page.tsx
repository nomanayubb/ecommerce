"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Branding {
  name: string; tagline: string; logoUrl: string; logoUrlDark: string; brandColor: string; brandColorDark: string; accentColor: string;
  radius: number; font: "system" | "serif" | "rounded" | "mono"; defaultTheme: "light" | "dark" | "oled"; announcement: string; pack: string;
}

// Keep in sync with apps/web/src/themes/index.ts
const PACKS = [["default", "Default (no decoration)"], ["halloween", "Halloween"], ["eid", "Eid / Ramadan"], ["christmas", "Christmas / Winter"], ["blackfriday", "Black Friday / Mega Sale"], ["independence", "Independence Day"]];

export default function Settings() {
  const [b, setB] = useState<Branding | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api<{ branding: Branding }>("/settings").then((r) => setB(r.branding)).catch((e) => setMsg(e.message)); }, []);
  if (!b) return <p className="text-muted">{msg || "Loading…"}</p>;

  const set = <K extends keyof Branding>(k: K, v: Branding[K]) => setB({ ...b, [k]: v });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/admin/settings", { method: "PUT", body: JSON.stringify(b) });
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
      <label className={label}>Announcement bar (empty = hidden)
        <input className={input} value={b.announcement} onChange={(e) => set("announcement", e.target.value)} />
      </label>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <button className="rounded bg-brand px-6 py-2 font-medium text-onbrand">Save</button>
    </form>
  );
}
