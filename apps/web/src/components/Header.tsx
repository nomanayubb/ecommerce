"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { pkr, type CategoryNode } from "@/lib/api";
import { useCart } from "./CartProvider";
import { BagIcon, ContrastIcon, HeartIcon, MenuIcon, MotionIcon, SearchIcon, UserIcon } from "./icons";
import { useSession } from "./SessionProvider";
import { useShopper } from "./Shopper";
import { SearchBox } from "./SearchBox";
import { send } from "@/lib/client";
import { SoundToggle } from "./SoundToggle";
import { MascotFigure } from "./Mascot";
import { useSite } from "./Site";

const THEMES = ["dark", "oled", "light", "auto"] as const;
const resolveTheme = (t: string) => (t === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : t);

export function Logo({ logo, logoDark, name, className = "h-9" }: { logo: string; logoDark?: string; name: string; className?: string }) {
  if (!logo) return <span data-logo className="text-lg font-semibold uppercase tracking-[0.3em]">{name}</span>;
  return (
    <span data-logo className="contents">
      <img src={logo} alt={name} width={185} height={36} className={`logo-on-light w-auto max-w-none ${className}`} />
      <img src={logoDark || logo} alt={name} width={185} height={36} className={`logo-on-dark w-auto max-w-none ${className}`} />
    </span>
  );
}

function ThemeToggle({ labelled = false, className = "" }: { labelled?: boolean; className?: string }) {
  const [theme, setTheme] = useState<string>("dark");
  useEffect(() => { try { setTheme(localStorage.getItem("theme") ?? document.documentElement.dataset.theme ?? "dark"); } catch { setTheme(document.documentElement.dataset.theme ?? "dark"); } }, []);
  // "Auto" follows the device and updates when the device switches between light and dark.
  useEffect(() => {
    if (theme !== "auto") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    const on = () => { document.documentElement.dataset.theme = resolveTheme("auto"); };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);
  const next = () => {
    const t = THEMES[(THEMES.indexOf(theme as (typeof THEMES)[number]) + 1) % THEMES.length];
    const root = document.documentElement;
    root.classList.add("theme-anim"); // smooth cross-fade between themes
    root.dataset.theme = resolveTheme(t);
    setTimeout(() => root.classList.remove("theme-anim"), 450);
    try { localStorage.setItem("theme", t); } catch {}
    setTheme(t);
  };
  return (
    <button onClick={next} className={`flex items-center gap-3 p-2 text-muted transition hover:text-accent ${className}`} aria-label={`Theme: ${theme}. Click to change`} title={`Theme: ${theme}`}>
      <ContrastIcon size={18} />
      {labelled && <span className="text-xs uppercase tracking-widest">Theme: {theme}</span>}
    </button>
  );
}

/** Visitor override for animations: lets people re-enable motion even if the OS asks for reduced motion (default follows the OS). */
function MotionToggle({ labelled = false, className = "" }: { labelled?: boolean; className?: string }) {
  const [on, setOn] = useState(true);
  const effective = () => {
    const d = document.documentElement.dataset;
    if (d.motion === "off" || d.motionPref === "off") return false;
    if (d.motionPref === "on") return true;
    return !matchMedia("(prefers-reduced-motion: reduce)").matches;
  };
  useEffect(() => setOn(effective()), []);
  const toggle = () => {
    const next = on ? "off" : "on";
    document.documentElement.dataset.motionPref = next;
    try { localStorage.setItem("motion-pref", next); } catch {}
    setOn(next === "on");
  };
  return (
    <button onClick={toggle} aria-pressed={on} aria-label={`Animations ${on ? "on" : "off"}. Click to turn ${on ? "off" : "on"}`} title={`Animations: ${on ? "on" : "off"}`}
      className={`flex items-center gap-3 p-2 transition hover:text-accent ${on ? "text-accent" : "text-muted"} ${className}`}>
      <MotionIcon size={18} />
      {labelled && <span className="text-xs uppercase tracking-widest">Animations: {on ? "on" : "off"}</span>}
    </button>
  );
}

/** Loads one branch of the category tree the first time a menu is opened, so pages never carry the whole tree. */
function useBranch(slug: string, enabled: boolean) {
  const [kids, setKids] = useState<CategoryNode[] | null>(null);
  useEffect(() => {
    if (!enabled || kids) return;
    let live = true;
    send<{ children: CategoryNode[] }>("GET", `categories/children/${slug}`).then((r) => live && setKids(r.children)).catch(() => live && setKids([]));
    return () => { live = false; };
  }, [enabled, kids, slug]);
  return kids;
}

function MegaItem({ node }: { node: CategoryNode }) {
  const [wanted, setWanted] = useState(false);
  const kids = useBranch(node.slug, wanted && !!node.hasChildren);
  const wide = (kids?.length ?? 0) > 6;
  return (
    <div className="group relative" onMouseEnter={() => setWanted(true)} onFocus={() => setWanted(true)}>
      <Link href={`/collections/${node.slug}`} className="relative block whitespace-nowrap py-5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] transition hover:text-accent">
        {node.name}
        <span className="absolute inset-x-0 bottom-3 h-px origin-left scale-x-0 bg-accent transition-transform group-hover:scale-x-100" />
      </Link>
      {node.hasChildren && (
        <div className={`invisible absolute left-0 top-full z-30 max-h-[70vh] overflow-y-auto border border-line bg-card translate-y-1 p-5 opacity-0 shadow-2xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${wide ? "w-[min(920px,92vw)]" : "min-w-[260px]"}`}>
          {!kids ? <p className="text-sm text-muted">Loading…</p> : (
            <div className={wide ? "grid grid-cols-3 gap-x-8 gap-y-5" : ""}>
              {kids.map((c) => (
                <div key={c.id} className={wide ? "" : "mb-3 last:mb-0"}>
                  <Link href={`/collections/${c.slug}`} className="text-sm font-medium hover:text-accent">{c.name}</Link>
                  <ul className="ml-3 mt-1 space-y-0.5 text-sm text-muted">
                    {c.children.map((g) => <li key={g.id}><Link href={`/collections/${g.slug}`} className="hover:text-accent">{g.name}</Link></li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Menus past the first few (admin: Settings, Menu links) sit under "More". Point at one to see its sub menus beside the list. */
function MoreMenu({ nodes }: { nodes: CategoryNode[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<CategoryNode>(nodes[0]);
  const kids = useBranch(active.slug, open && !!active.hasChildren);
  return (
    <div className="group relative" onMouseEnter={() => setOpen(true)} onFocus={() => setOpen(true)}>
      <button type="button" className="relative block whitespace-nowrap py-5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] transition hover:text-accent">More ▾</button>
      <div className="invisible absolute right-0 top-full z-30 grid max-h-[70vh] w-[min(940px,94vw)] grid-cols-[230px_1fr] overflow-hidden border border-line bg-card opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <ul className="max-h-[70vh] overflow-y-auto border-r border-line py-2">
          {nodes.map((n) => (
            <li key={n.id}>
              <Link href={`/collections/${n.slug}`} onMouseEnter={() => setActive(n)} onFocus={() => setActive(n)}
                className={`flex items-center justify-between px-5 py-2 text-sm transition hover:text-accent ${active.id === n.id ? "bg-accent/10 text-accent" : ""}`}>
                {n.name}{n.hasChildren && <span aria-hidden className="text-xs">›</span>}
              </Link>
            </li>
          ))}
          <li><Link href="/collections" className="mt-1 block border-t border-line px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Browse all collections →</Link></li>
        </ul>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <Link href={`/collections/${active.slug}`} className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-accent">All {active.name} →</Link>
          {!active.hasChildren ? <p className="text-sm text-muted">No sub menus.</p> : !kids ? <p className="text-sm text-muted">Loading…</p> : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {kids.map((c) => (
                <div key={c.id}>
                  <Link href={`/collections/${c.slug}`} className="text-sm font-medium hover:text-accent">{c.name}</Link>
                  <ul className="ml-3 mt-1 space-y-0.5 text-sm text-muted">
                    {c.children.map((g) => <li key={g.id}><Link href={`/collections/${g.slug}`} className="hover:text-accent">{g.name}</Link></li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Phone menu: one line per top menu, opening to its sub menus. */
function MobileCat({ node }: { node: CategoryNode }) {
  const [open, setOpen] = useState(false);
  const kids = useBranch(node.slug, open && !!node.hasChildren);
  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href={`/collections/${node.slug}`} className="block flex-1 py-2 uppercase tracking-widest">{node.name}</Link>
        {node.hasChildren && <button type="button" aria-expanded={open} aria-label={`Show ${node.name} sub menus`} onClick={() => setOpen((v) => !v)} className="px-3 py-2 text-accent">{open ? "−" : "+"}</button>}
      </div>
      {open && (
        <ul className="mb-2 ml-3 max-h-72 space-y-1 overflow-y-auto border-l border-line pl-3 text-muted">
          {!kids ? <li>Loading…</li> : kids.map((c) => <li key={c.id}><Link href={`/collections/${c.slug}`} className="block py-1 hover:text-accent">{c.name}</Link></li>)}
        </ul>
      )}
    </div>
  );
}

export function Header({ categories, brand, cta, hints }: { categories: CategoryNode[]; brand: { name: string; logoUrl: string; logoUrlDark?: string }; cta?: { label: string; href: string }; hints?: string[] }) {
  const { count, setOpen, lines } = useCart();
  const freeAt = useSite().store.freeShippingThreshold;
  const shown = Math.max(1, useSite().store.headerMenuCount ?? 4);
  const ring = freeAt > 0 && lines.length ? lines.reduce((t, l) => t + l.price * l.quantity, 0) / freeAt : 0;
  const { wish } = useShopper();
  const { user } = useSession();
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);

  // Mini-header behaviour: slide away while scrolling down, return on any scroll up.
  useEffect(() => {
    const onScroll = () => {
      const y = scrollY;
      setHidden(y > 160 && y > last.current + 4);
      if (Math.abs(y - last.current) > 4) last.current = y;
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`header-bar sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md ${hidden ? "header-hidden" : ""}`}>
      {useSite().branding.visuals?.headerStyle === "peek" && <span aria-hidden className="header-peek hidden text-fg sm:block"><MascotFigure mood="happy" size={34} /></span>}
      <div className="mx-auto flex max-w-[var(--maxw)] items-center gap-1 px-4 sm:gap-5">
        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none p-2" aria-label="Menu"><MenuIcon size={22} /></summary>
          <nav className="absolute left-0 top-full w-64 border border-line bg-card p-4 text-sm shadow-2xl">
            <div className="mb-3"><SearchBox hints={hints} className="w-full border-b border-line bg-transparent py-2 pl-6 text-sm outline-none placeholder:text-muted focus:border-accent" panelClass="!w-full" /></div>
            <div className="max-h-[50vh] overflow-y-auto">{categories.map((c) => <MobileCat key={c.id} node={c} />)}</div>
            {(useSite().branding.navLinks ?? []).map((l) => <Link key={l.href + l.label} href={l.href} className="block py-2 uppercase tracking-widest text-accent">{l.label}</Link>)}
            <Link href="/products" className="block py-2 uppercase tracking-widest text-accent">All products</Link>
            <Link href={user ? "/account" : "/login"} className="block py-2 uppercase tracking-widest">{user ? "My account" : "Sign in"}</Link>
            <Link href="/track" className="block py-2 uppercase tracking-widest">Track order</Link>
            <div className="mt-2 border-t border-line pt-2"><ThemeToggle labelled className="!px-0" /><MotionToggle labelled className="!px-0" /></div>
          </nav>
        </details>
        <Link href="/" className="logo-reveal mr-auto flex shrink-0 items-center py-3 sm:mr-0" aria-label={brand.name}>
          <span className="logo-morph relative inline-flex items-center">
            <span className="logo-full inline-flex items-center" style={brand.logoUrl ? ({ "--logo-mask": `url(${brand.logoUrlDark || brand.logoUrl})` } as React.CSSProperties) : undefined}><Logo logo={brand.logoUrl} logoDark={brand.logoUrlDark} name={brand.name} className="h-7 sm:h-9" />{brand.logoUrl && <span aria-hidden className="logo-sheen" />}</span>
            {useSite().branding.visuals?.logoMorph && <span aria-hidden className="logo-mini absolute left-0 top-1/2 -translate-y-1/2 text-fg"><MascotFigure mood="happy" size={36} /></span>}
          </span>
        </Link>
        <nav className="hidden flex-1 justify-center gap-8 lg:flex">
          {categories.slice(0, shown).map((c) => <MegaItem key={c.id} node={c} />)}
          {categories.length > shown && <MoreMenu nodes={categories.slice(shown)} />}
          {(useSite().branding.navLinks ?? []).map((l) => <Link key={l.href + l.label} href={l.href} className="px-3 py-4 text-xs font-semibold uppercase tracking-[0.2em] transition hover:text-accent">{l.label}</Link>)}
        </nav>
        <div className="ml-auto hidden lg:block"><SearchBox hints={hints} className="w-36 border-b border-line bg-transparent py-1 pl-6 pr-1 text-sm outline-none transition-all placeholder:text-muted focus:w-52 focus:border-accent" /></div>
        <Link href="/products" className="ml-auto hidden p-2 text-muted transition hover:text-accent sm:block lg:hidden" aria-label="Search"><SearchIcon size={20} /></Link>
        {cta?.label && cta.href && <Link href={cta.href} className="btn btn-primary hidden !px-4 !py-2 xl:inline-flex">{cta.label}</Link>}
        <MotionToggle className="hidden lg:flex" />
        {useSite().branding.visuals?.sound && <SoundToggle className="hidden lg:flex" />}
        <ThemeToggle className="hidden lg:flex" />
        <Link href={user ? "/account" : "/login"} className="hidden p-2 transition hover:text-accent sm:block" aria-label={user ? "My account" : "Sign in"} title={user ? "My account" : "Sign in"}><UserIcon size={22} /></Link>
        <Link href="/wishlist" className="relative p-2 transition hover:text-accent" aria-label={`Wishlist, ${wish.length} saved`}>
          <HeartIcon size={22} filled={wish.length > 0} />
          {wish.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[0.6rem] font-semibold leading-4 text-onbrand">{wish.length}</span>}
        </Link>
        <button data-bag onClick={() => setOpen(true)} className="relative flex items-center gap-2 p-2 transition hover:text-accent" aria-label={`Open bag, ${count} items`} title={ring > 0 ? (ring >= 1 ? "Free delivery unlocked" : `${Math.round(ring * 100)}% of the way to free delivery`) : undefined}>
          {ring > 0 && <svg aria-hidden viewBox="0 0 36 36" width={36} height={36} className="pointer-events-none absolute left-[1px] top-1/2 -translate-y-1/2 -rotate-90"><circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="1.5" /><circle cx="18" cy="18" r="16" fill="none" stroke="rgb(var(--accent))" strokeWidth="1.8" strokeLinecap="round" strokeDasharray={100.5} strokeDashoffset={100.5 * (1 - Math.min(1, ring))} style={{ transition: "stroke-dashoffset .6s ease" }} /></svg>}
          <BagIcon size={22} />
          {lines.length > 0 && <span className="hidden text-xs font-semibold tabular-nums xl:inline">{pkr(lines.reduce((t, l) => t + l.price * l.quantity, 0))}</span>}
          <span key={count} className="count-pop inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.65rem] font-semibold leading-5 text-onbrand">{count}</span>
        </button>
      </div>
    </header>
  );
}
