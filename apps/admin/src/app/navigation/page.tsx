"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

interface Item { label: string; href: string }
interface Col { title: string; links: Item[] }
interface Footer { columns: Col[]; showNewsletter: boolean; showPerks: boolean; showPayments: boolean; note: string }
type Branding = { navLinks: Item[] } & Record<string, unknown>;
interface Opt { group: string; label: string; href: string }

const input = "w-full rounded border border-line bg-card px-3 py-2 text-sm";
const CUSTOM = "__custom";
const STATIC: Opt[] = [
  { group: "Shop", label: "Home", href: "/" },
  { group: "Shop", label: "All products", href: "/products" },
  { group: "Shop", label: "All collections", href: "/collections" },
  { group: "Shop", label: "Best prices (low to high)", href: "/products?sort=price_asc" },
  { group: "Shop", label: "New arrivals", href: "/products?sort=newest" },
  { group: "Content", label: "Blog / journal", href: "/blog" },
  { group: "Content", label: "Recipes", href: "/recipes" },
  { group: "Content", label: "Bundles / sets", href: "/bundles" },
  { group: "Account", label: "Track your order", href: "/track" },
  { group: "Account", label: "My account", href: "/account" },
  { group: "Account", label: "Wishlist", href: "/wishlist" },
];

/** One list of links: label, a picker for where it goes (or a custom address), reorder and remove. */
function LinkList({ items, onChange, max, opts }: { items: Item[]; onChange: (v: Item[]) => void; max: number; opts: Opt[] }) {
  const groups = useMemo(() => [...new Set(opts.map((o) => o.group))], [opts]);
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= items.length) return; const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  const upd = (i: number, patch: Partial<Item>) => onChange(items.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const known = opts.some((o) => o.href === it.href);
        return (
          <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-2">
            <input className={input} placeholder="Label" maxLength={40} value={it.label} onChange={(e) => upd(i, { label: e.target.value })} />
            <div className="flex gap-2">
              <select className={input} value={known ? it.href : CUSTOM} onChange={(e) => {
                const v = e.target.value;
                if (v === CUSTOM) upd(i, { href: "/" });
                else upd(i, { href: v, label: it.label || opts.find((o) => o.href === v)?.label || "" });
              }}>
                {groups.map((g) => <optgroup key={g} label={g}>{opts.filter((o) => o.group === g).map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}</optgroup>)}
                <option value={CUSTOM}>Custom address…</option>
              </select>
              {!known && <input className={input} placeholder="/page or https://…" value={it.href} onChange={(e) => upd(i, { href: e.target.value })} />}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <button type="button" className="px-1 text-muted hover:text-accent" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button type="button" className="px-1 text-muted hover:text-accent" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              <button type="button" className="px-1 text-muted hover:text-red-500" onClick={() => onChange(items.filter((_, n) => n !== i))} aria-label="Remove">✕</button>
            </div>
          </div>
        );
      })}
      {items.length < max && <button type="button" className="text-sm text-accent hover:underline" onClick={() => onChange([...items, { label: "", href: "/products" }])}>+ Add menu item</button>}
      {items.length >= max && <p className="text-xs text-muted">Most items allowed here: {max}.</p>}
    </div>
  );
}

export default function Navigation() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [footer, setFooter] = useState<Footer | null>(null);
  const [opts, setOpts] = useState<Opt[]>(STATIC);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ branding: Branding; footer: Footer }>("/settings"),
      api<{ name: string; slug: string }[]>("/admin/collections").catch(() => []),
      api<{ key: string; title: string }[]>("/admin/templates").catch(() => []),
    ]).then(([s, cols, pages]) => {
      setBranding({ ...s.branding, navLinks: s.branding.navLinks ?? [] });
      setFooter(s.footer);
      setOpts([
        ...STATIC,
        ...cols.map((c) => ({ group: "Collections", label: c.name, href: `/collections/${c.slug}` })),
        ...pages.filter((p) => p.key.startsWith("page:")).map((p) => ({ group: "Pages", label: p.title, href: `/p/${p.key.slice(5)}` })),
      ]);
    }).catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);

  if (!branding || !footer) return <p className="text-muted">{msg?.text ?? "Loading..."}</p>;

  async function save() {
    setMsg(null);
    try {
      const clean = (l: Item[]) => l.filter((x) => x.label.trim() && x.href.trim()).map((x) => ({ label: x.label.trim(), href: x.href.trim() }));
      await api("/admin/settings", { method: "PUT", body: JSON.stringify({ ...branding, navLinks: clean(branding!.navLinks).slice(0, 12) }) });
      await api("/admin/footer-settings", { method: "PUT", body: JSON.stringify({ ...footer, columns: footer!.columns.filter((c) => c.title.trim()).map((c) => ({ title: c.title.trim(), links: clean(c.links).slice(0, 8) })) }) });
      setMsg({ ok: true, text: "Saved. The shop shows it within about 30 seconds." });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save" }); }
  }
  const setCol = (i: number, patch: Partial<Col>) => setFooter({ ...footer, columns: footer.columns.map((c, n) => (n === i ? { ...c, ...patch } : c)) });

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Navigation</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">Build the menus shoppers use. Pick where each item goes from your collections, pages and shop links, or type any address. Use the arrows to change the order.</p>
      {msg && <p className={`mb-4 text-sm ${msg.ok ? "text-accent" : "text-red-500"}`}>{msg.text}</p>}

      <section className="mb-8 max-w-4xl space-y-4 rounded border border-line bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest">Main menu (top of every page)</h2>
          <p className="mt-1 text-xs text-muted">Your collections already appear first, with their drop-down. Items here are added after them.</p>
        </div>
        <LinkList items={branding.navLinks} onChange={(v) => setBranding({ ...branding, navLinks: v })} max={12} opts={opts} />
      </section>

      <section className="mb-8 max-w-4xl space-y-6 rounded border border-line bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest">Footer menu (bottom of every page)</h2>
          <p className="mt-1 text-xs text-muted">Up to 4 columns with up to 8 links each. A column with no title is not shown.</p>
        </div>
        {footer.columns.map((c, i) => (
          <div key={i} className="space-y-3 border-t border-line pt-4">
            <div className="flex items-center gap-3">
              <input className={`${input} max-w-xs`} placeholder="Column title" maxLength={40} value={c.title} onChange={(e) => setCol(i, { title: e.target.value })} />
              <button type="button" className="text-sm text-muted hover:text-red-500" onClick={() => setFooter({ ...footer, columns: footer.columns.filter((_, n) => n !== i) })}>Remove column</button>
            </div>
            <LinkList items={c.links} onChange={(v) => setCol(i, { links: v })} max={8} opts={opts} />
          </div>
        ))}
        {footer.columns.length < 4 && <button type="button" className="text-sm text-accent hover:underline" onClick={() => setFooter({ ...footer, columns: [...footer.columns, { title: "", links: [] }] })}>+ Add footer column</button>}
      </section>

      <button onClick={save} className="rounded bg-brand px-6 py-2 text-sm font-medium text-onbrand">Save menus</button>
    </>
  );
}
