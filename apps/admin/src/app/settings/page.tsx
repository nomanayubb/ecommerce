"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

type Font = "system" | "serif" | "rounded" | "mono";
interface Branding {
  name: string; tagline: string; logoUrl: string; logoUrlDark: string; brandColor: string; brandColorDark: string; accentColor: string;
  radius: number; font: Font; headingFont: "inherit" | Font; defaultTheme: "light" | "dark" | "oled"; announcement: string; announcements: string[];
  pack: string; motion: "off" | "subtle" | "full"; inkColor: string; creamColor: string; darkColor: string; heroText: string; promiseText: string; footerText: string;
  buttonStyle: "solid" | "outline" | "pill"; cardStyle: "classic" | "minimal" | "compact"; badgeStyle: "solid" | "outline" | "pill"; layoutWidth: "boxed" | "wide" | "full";
  headerCta: { label: string; href: string };
  searchHints: string[]; effects: Record<"ripple" | "flyToCart" | "backToTop" | "cookieNotice" | "newsletterPopup" | "iconBadges", boolean>;
  social: Record<"instagram" | "facebook" | "tiktok" | "youtube" | "whatsapp" | "x", string>;
}
interface Store { freeShippingThreshold: number; shippingFee: number; giftWrapEnabled?: boolean; giftWrapFee?: number }
interface Footer { columns: { title: string; links: { label: string; href: string }[] }[]; showNewsletter: boolean; showPerks: boolean; showPayments: boolean; note: string }

// Keep in sync with apps/web/src/themes/index.ts
const PACKS = [["default", "Default (no decoration)"], ["halloween", "Halloween"], ["eid", "Eid / Ramadan"], ["christmas", "Christmas / Winter"], ["blackfriday", "Black Friday / Mega Sale"], ["independence", "Independence Day"]];

/** Colour schemes: ink, cream, charcoal, brand (light), brand (dark), accent. Applying one only fills the fields; nothing is saved until you press Save. */
const SCHEMES: { name: string; v: Pick<Branding, "inkColor" | "creamColor" | "darkColor" | "brandColor" | "brandColorDark" | "accentColor"> }[] = [
  { name: "Gold & charcoal", v: { inkColor: "#1e1e20", creamColor: "#faf6ee", darkColor: "#0f0f11", brandColor: "#1c1c1e", brandColorDark: "#d4aa46", accentColor: "#b88c2c" } },
  { name: "Emerald", v: { inkColor: "#0b3d2e", creamColor: "#f3f7f4", darkColor: "#06201a", brandColor: "#0b3d2e", brandColorDark: "#2fd6a0", accentColor: "#0f8a64" } },
  { name: "Royal navy", v: { inkColor: "#14213d", creamColor: "#f5f7fb", darkColor: "#0a1128", brandColor: "#14213d", brandColorDark: "#fca311", accentColor: "#c77d00" } },
  { name: "Rose", v: { inkColor: "#3b1d2a", creamColor: "#fbf4f6", darkColor: "#1b0d14", brandColor: "#3b1d2a", brandColorDark: "#f08fb0", accentColor: "#c2476f" } },
  { name: "Terracotta", v: { inkColor: "#3d2214", creamColor: "#fbf3ec", darkColor: "#1a0f09", brandColor: "#3d2214", brandColorDark: "#e8a07a", accentColor: "#b5562b" } },
  { name: "Ocean", v: { inkColor: "#0b2a3c", creamColor: "#f1f8fb", darkColor: "#061a26", brandColor: "#0b2a3c", brandColorDark: "#4cc9f0", accentColor: "#0a7ea4" } },
  { name: "Monochrome", v: { inkColor: "#111111", creamColor: "#f6f6f6", darkColor: "#0a0a0a", brandColor: "#111111", brandColorDark: "#ffffff", accentColor: "#555555" } },
];
const TYPE_PRESETS: { name: string; font: Font; heading: Branding["headingFont"]; note: string }[] = [
  { name: "Modern", font: "system", heading: "inherit", note: "Clean sans-serif everywhere" },
  { name: "Editorial", font: "system", heading: "serif", note: "Serif headlines, sans-serif text" },
  { name: "Classic", font: "serif", heading: "inherit", note: "Serif everywhere" },
  { name: "Friendly", font: "rounded", heading: "inherit", note: "Soft rounded letters" },
  { name: "Technical", font: "mono", heading: "system", note: "Monospace text, sans headlines" },
];
const SOCIALS = [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["whatsapp", "WhatsApp"], ["x", "X"]] as const;

const input = "w-full rounded border border-line bg-card px-3 py-2 text-sm";
const label = "block text-sm text-muted";
const color = "h-10 w-full rounded border border-line bg-card";

function Group({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded border border-line">
      <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-widest">{title}</summary>
      <div className="space-y-4 border-t border-line p-4">{children}</div>
    </details>
  );
}

export default function Settings() {
  const [b, setB] = useState<Branding | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [footer, setFooter] = useState<Footer | null>(null);
  const [linksText, setLinksText] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<{ branding: Branding; store: Store; footer: Footer }>("/settings")
      .then((r) => {
        setB({ ...r.branding, announcements: r.branding.announcements ?? [], headerCta: r.branding.headerCta ?? { label: "", href: "" }, social: { ...({ instagram: "", facebook: "", tiktok: "", youtube: "", whatsapp: "", x: "" } as Branding["social"]), ...(r.branding.social ?? {}) }, headingFont: r.branding.headingFont ?? "inherit", buttonStyle: r.branding.buttonStyle ?? "solid", cardStyle: r.branding.cardStyle ?? "classic", badgeStyle: r.branding.badgeStyle ?? "solid", layoutWidth: r.branding.layoutWidth ?? "boxed", searchHints: r.branding.searchHints ?? [], effects: { ...({ ripple: true, flyToCart: true, backToTop: true, cookieNotice: true, newsletterPopup: false, iconBadges: true } as Branding["effects"]), ...(r.branding.effects ?? {}) } });
        setStore(r.store); setFooter(r.footer);
        setLinksText(r.footer.columns.map((c) => c.links.map((l) => `${l.label} | ${l.href}`).join("\n")));
      })
      .catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);
  if (!b || !store || !footer) return <p className="text-muted">{msg?.text || "Loading…"}</p>;

  const set = <K extends keyof Branding>(k: K, v: Branding[K]) => setB((prev) => (prev ? { ...prev, [k]: v } : prev));
  const setCol = (i: number, patch: Partial<Footer["columns"][number]>) => setFooter({ ...footer, columns: footer.columns.map((c, n) => (n === i ? { ...c, ...patch } : c)) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      // footer links are typed one per line as "Label | /address"
      const columns = footer!.columns.filter((c) => c.title.trim()).map((c) => ({
        title: c.title.trim(),
        links: (linksText[footer!.columns.indexOf(c)] ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [lab, ...rest] = l.split("|"); return { label: lab.trim(), href: (rest.join("|").trim() || "/") }; }),
      }));
      await api("/admin/settings", { method: "PUT", body: JSON.stringify({ ...b, announcements: b!.announcements.map((a) => a.trim()).filter(Boolean).slice(0, 5), searchHints: b!.searchHints.map((a) => a.trim()).filter(Boolean).slice(0, 6) }) });
      await api("/admin/store-settings", { method: "PUT", body: JSON.stringify(store) });
      await api("/admin/footer-settings", { method: "PUT", body: JSON.stringify({ ...footer, columns }) });
      setMsg({ ok: true, text: "Saved. The storefront updates within about 30 seconds." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed" });
    }
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Brand & theme</h1>
        <button className="rounded bg-brand px-6 py-2 text-sm font-medium text-onbrand">Save everything</button>
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-accent" : "text-red-500"}`}>{msg.text}</p>}

      <Group title="Identity" open>
        <label className={label}>Store name<input className={input} value={b.name} onChange={(e) => set("name", e.target.value)} required /></label>
        <label className={label}>Tagline<input className={input} value={b.tagline} onChange={(e) => set("tagline", e.target.value)} /></label>
        <label className={label}>Logo URL (http(s) or /path, empty = show name)<input className={input} value={b.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} /></label>
        {b.logoUrl && <img src={b.logoUrl} alt="Logo preview" className="h-12 w-auto rounded border border-line bg-[#faf6ee] p-2" />}
        <label className={label}>Logo for dark backgrounds (optional)<input className={input} value={b.logoUrlDark ?? ""} onChange={(e) => set("logoUrlDark", e.target.value)} /></label>
        {b.logoUrlDark && <img src={b.logoUrlDark} alt="Dark logo preview" className="h-12 w-auto rounded border border-line bg-[#0f0f11] p-2" />}
      </Group>

      <Group title="Colours" open>
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted">Colour schemes (fills the colours below, then press Save)</p>
          <div className="flex flex-wrap gap-2">
            {SCHEMES.map((s) => (
              <button key={s.name} type="button" onClick={() => setB((prev) => (prev ? { ...prev, ...s.v } : prev))} className="flex items-center gap-2 rounded border border-line px-3 py-2 text-xs transition hover:border-accent">
                <span className="flex">{[s.v.darkColor, s.v.brandColorDark, s.v.creamColor].map((c, i) => <span key={i} className="h-4 w-4 border border-line" style={{ background: c }} />)}</span>{s.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {([["inkColor", "Ink (text, light mode)"], ["creamColor", "Cream (light page)"], ["darkColor", "Charcoal (dark page, hero)"], ["brandColor", "Brand (light mode)"], ["brandColorDark", "Brand (dark / OLED)"], ["accentColor", "Accent (light mode)"]] as const).map(([k, l]) => (
            <label key={k} className={label}>{l}<input type="color" className={color} value={b[k] ?? "#000000"} onChange={(e) => set(k, e.target.value)} /></label>
          ))}
        </div>
        <label className={label}>Default theme
          <select className={input} value={b.defaultTheme} onChange={(e) => set("defaultTheme", e.target.value as Branding["defaultTheme"])}><option value="light">Light</option><option value="dark">Dark</option><option value="oled">OLED</option></select>
        </label>
        <label className={label}>Occasion theme pack (overrides colours while active)
          <select className={input} value={b.pack ?? "default"} onChange={(e) => set("pack", e.target.value)}>{PACKS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        </label>
      </Group>

      <Group title="Typography & shape">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted">Font pairings</p>
          <div className="flex flex-wrap gap-2">
            {TYPE_PRESETS.map((t) => {
              const on = b.font === t.font && b.headingFont === t.heading;
              return <button key={t.name} type="button" title={t.note} onClick={() => setB((prev) => (prev ? { ...prev, font: t.font, headingFont: t.heading } : prev))} className={`rounded border px-3 py-2 text-xs transition hover:border-accent ${on ? "border-accent text-accent" : "border-line"}`}>{t.name}</button>;
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Body font<select className={input} value={b.font} onChange={(e) => set("font", e.target.value as Font)}><option value="system">Modern (system)</option><option value="serif">Elegant (serif)</option><option value="rounded">Friendly (rounded)</option><option value="mono">Technical (mono)</option></select></label>
          <label className={label}>Headline font<select className={input} value={b.headingFont} onChange={(e) => set("headingFont", e.target.value as Branding["headingFont"])}><option value="inherit">Same as body</option><option value="system">Modern (system)</option><option value="serif">Elegant (serif)</option><option value="rounded">Friendly (rounded)</option><option value="mono">Technical (mono)</option></select></label>
        </div>
        <label className={label}>Corner radius: {b.radius}px<input type="range" min={0} max={28} value={b.radius} onChange={(e) => set("radius", Number(e.target.value))} className="w-full" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Button style<select className={input} value={b.buttonStyle} onChange={(e) => set("buttonStyle", e.target.value as Branding["buttonStyle"])}><option value="solid">Solid</option><option value="outline">Outline</option><option value="pill">Solid, pill-shaped</option></select></label>
          <label className={label}>Product card style<select className={input} value={b.cardStyle} onChange={(e) => set("cardStyle", e.target.value as Branding["cardStyle"])}><option value="classic">Classic (framed)</option><option value="minimal">Minimal (no frame)</option><option value="compact">Compact (square photo)</option></select></label>
          <label className={label}>Discount badge style<select className={input} value={b.badgeStyle} onChange={(e) => set("badgeStyle", e.target.value as Branding["badgeStyle"])}><option value="solid">Solid</option><option value="outline">Outline</option><option value="pill">Pill</option></select></label>
          <label className={label}>Page width<select className={input} value={b.layoutWidth} onChange={(e) => set("layoutWidth", e.target.value as Branding["layoutWidth"])}><option value="boxed">Boxed (1280px)</option><option value="wide">Wide (1600px)</option><option value="full">Full width</option></select></label>
        </div>
        <label className={label}>Animation intensity<select className={input} value={b.motion ?? "full"} onChange={(e) => set("motion", e.target.value as Branding["motion"])}><option value="full">Full (reveals, tilt, animated hero)</option><option value="subtle">Subtle (reveals only)</option><option value="off">Off (no motion)</option></select></label>
      </Group>

      <Group title="Header & announcements">
        <label className={label}>Announcement bar: one message per line, up to 5 (they rotate; empty = hidden)
          <textarea rows={4} className={input} value={b.announcements.length ? b.announcements.join("\n") : b.announcement} onChange={(e) => setB((prev) => (prev && { ...prev, announcements: e.target.value.split("\n").slice(0, 5), announcement: "" }))} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Header button label (empty = none)<input className={input} maxLength={30} value={b.headerCta.label} onChange={(e) => set("headerCta", { ...b.headerCta, label: e.target.value })} /></label>
          <label className={label}>Header button link<input className={input} placeholder="/products" value={b.headerCta.href} onChange={(e) => set("headerCta", { ...b.headerCta, href: e.target.value })} /></label>
        </div>
      </Group>

      <Group title="Shopper experience">
        <label className={label}>Search box hints: one per line, up to 6 (they rotate in the placeholder, e.g. Try "gift sets")
          <textarea rows={3} className={input} value={b.searchHints.join("\n")} onChange={(e) => set("searchHints", e.target.value.split("\n").slice(0, 6))} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {([["ripple", "Button ripple on click"], ["flyToCart", "Product flies into the bag on add"], ["backToTop", "Back-to-top ring button"], ["cookieNotice", "Cookie notice"], ["newsletterPopup", "Newsletter popup (30 s or on leaving, once per 14 days)"], ["iconBadges", "Product icons from tags (dishwasher-safe, vegan, ...)"]] as const).map(([k, t]) => (
            <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={b.effects[k]} onChange={(e) => set("effects", { ...b.effects, [k]: e.target.checked })} />{t}</label>
          ))}
        </div>
        <p className="text-xs text-muted">Animations also respect the visitor's own animation switch and the Motion setting above.</p>
      </Group>

      <Group title="Footer builder">
        <div className="space-y-3">
          {footer.columns.map((c, i) => (
            <div key={i} className="rounded border border-line p-3">
              <div className="flex gap-2">
                <input aria-label={`Column ${i + 1} title`} className={input} placeholder="Column title" value={c.title} onChange={(e) => setCol(i, { title: e.target.value })} />
                <button type="button" className="rounded border border-line px-3 text-xs hover:border-red-500 hover:text-red-500" onClick={() => { setFooter({ ...footer, columns: footer.columns.filter((_, n) => n !== i) }); setLinksText(linksText.filter((_, n) => n !== i)); }}>Remove</button>
              </div>
              <textarea aria-label={`Column ${i + 1} links`} rows={4} className={`${input} mt-2`} placeholder={"One link per line:\nTrack your order | /track\nInstagram | https://instagram.com/yourbrand"} value={linksText[i] ?? ""} onChange={(e) => setLinksText(linksText.map((t, n) => (n === i ? e.target.value : t)))} />
            </div>
          ))}
          {footer.columns.length < 4 && <button type="button" className="rounded border border-line px-3 py-2 text-xs hover:border-accent hover:text-accent" onClick={() => { setFooter({ ...footer, columns: [...footer.columns, { title: "", links: [] }] }); setLinksText([...linksText, ""]); }}>+ Add column</button>}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {([["showPerks", "Delivery / support strip"], ["showNewsletter", "Newsletter signup"], ["showPayments", "Payment column"]] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={footer[k]} onChange={(e) => setFooter({ ...footer, [k]: e.target.checked })} /> {l}</label>
          ))}
        </div>
        <label className={label}>Small print (after the copyright)<input className={input} maxLength={200} value={footer.note} onChange={(e) => setFooter({ ...footer, note: e.target.value })} /></label>
      </Group>

      <Group title="Social media links">
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIALS.map(([k, l]) => <label key={k} className={label}>{l}<input className={input} placeholder="https://…  (empty = hidden)" value={b.social[k]} onChange={(e) => set("social", { ...b.social, [k]: e.target.value })} /></label>)}
        </div>
      </Group>

      <Group title="Copy & delivery rules">
        <label className={label}>Hero text<textarea rows={2} className={input} value={b.heroText ?? ""} onChange={(e) => set("heroText", e.target.value)} /></label>
        <label className={label}>Brand promise<textarea rows={2} className={input} value={b.promiseText ?? ""} onChange={(e) => set("promiseText", e.target.value)} /></label>
        <label className={label}>Footer text<textarea rows={2} className={input} value={b.footerText ?? ""} onChange={(e) => set("footerText", e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className={label}>Free delivery over (0 = always free)<input type="number" min={0} className={input} value={store.freeShippingThreshold} onChange={(e) => setStore({ ...store, freeShippingThreshold: Number(e.target.value) })} /></label>
          <label className={label}>Flat delivery fee<input type="number" min={0} className={input} value={store.shippingFee} onChange={(e) => setStore({ ...store, shippingFee: Number(e.target.value) })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!store.giftWrapEnabled} onChange={(e) => setStore({ ...store, giftWrapEnabled: e.target.checked })} />Offer gift wrap with a message</label>
          <label className={label}>Gift wrap fee (0 = free)<input type="number" min={0} className={input} value={store.giftWrapFee ?? 0} onChange={(e) => setStore({ ...store, giftWrapFee: Number(e.target.value) })} /></label>
        </div>
      </Group>

      <button className="rounded bg-brand px-6 py-2 text-sm font-medium text-onbrand">Save everything</button>
    </form>
  );
}
