"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CategoryNode } from "@/lib/api";
import { useCart } from "./CartProvider";
import { BagIcon, ContrastIcon, HeartIcon, MenuIcon, MotionIcon, SearchIcon, UserIcon } from "./icons";
import { useSession } from "./SessionProvider";
import { useShopper } from "./Shopper";
import { SearchBox } from "./SearchBox";
import { SoundToggle } from "./Visuals";
import { MascotFigure } from "./Mascot";
import { useSite } from "./Site";

const THEMES = ["dark", "oled", "light"] as const;

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
  useEffect(() => setTheme(document.documentElement.dataset.theme ?? "dark"), []);
  const next = () => {
    const t = THEMES[(THEMES.indexOf(theme as (typeof THEMES)[number]) + 1) % THEMES.length];
    const root = document.documentElement;
    root.classList.add("theme-anim"); // smooth cross-fade between themes
    root.dataset.theme = t;
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

function MegaItem({ node }: { node: CategoryNode }) {
  return (
    <div className="group relative">
      <Link href={`/products?category=${node.slug}`} className="relative block whitespace-nowrap py-5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] transition hover:text-accent">
        {node.name}
        <span className="absolute inset-x-0 bottom-3 h-px origin-left scale-x-0 bg-accent transition-transform group-hover:scale-x-100" />
      </Link>
      {node.children.length > 0 && (
        <div className="invisible absolute left-0 top-full z-30 min-w-[260px] border border-line bg-card translate-y-1 p-5 opacity-0 shadow-2xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
          {node.children.map((c) => (
            <div key={c.id} className="mb-3 last:mb-0">
              <Link href={`/products?category=${c.slug}`} className="text-sm font-medium hover:text-accent">{c.name}</Link>
              <ul className="ml-3 mt-1 space-y-0.5 text-sm text-muted">
                {c.children.map((g) => (
                  <li key={g.id}><Link href={`/products?category=${g.slug}`} className="hover:text-accent">{g.name}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header({ categories, brand, cta, hints }: { categories: CategoryNode[]; brand: { name: string; logoUrl: string; logoUrlDark?: string }; cta?: { label: string; href: string }; hints?: string[] }) {
  const { count, setOpen } = useCart();
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
            {categories.map((c) => (
              <Link key={c.id} href={`/products?category=${c.slug}`} className="block py-2 uppercase tracking-widest">{c.name}</Link>
            ))}
            <Link href="/products" className="block py-2 uppercase tracking-widest text-accent">All products</Link>
            <Link href={user ? "/account" : "/login"} className="block py-2 uppercase tracking-widest">{user ? "My account" : "Sign in"}</Link>
            <Link href="/track" className="block py-2 uppercase tracking-widest">Track order</Link>
            <div className="mt-2 border-t border-line pt-2"><ThemeToggle labelled className="!px-0" /><MotionToggle labelled className="!px-0" /></div>
          </nav>
        </details>
        <Link href="/" className="logo-reveal mr-auto flex shrink-0 items-center py-3 sm:mr-0" aria-label={brand.name}>
          <span className="logo-morph relative inline-flex items-center">
            <span className="logo-full inline-flex items-center"><Logo logo={brand.logoUrl} logoDark={brand.logoUrlDark} name={brand.name} className="h-7 sm:h-9" /></span>
            {useSite().branding.visuals?.logoMorph && <span aria-hidden className="logo-mini absolute left-0 top-1/2 -translate-y-1/2 text-fg"><MascotFigure mood="happy" size={36} /></span>}
          </span>
        </Link>
        <nav className="hidden flex-1 justify-center gap-8 lg:flex">
          {categories.map((c) => <MegaItem key={c.id} node={c} />)}
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
        <button data-bag onClick={() => setOpen(true)} className="relative flex items-center gap-2 p-2 transition hover:text-accent" aria-label={`Open bag, ${count} items`}>
          <BagIcon size={22} />
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.65rem] font-semibold leading-5 text-onbrand">{count}</span>
        </button>
      </div>
    </header>
  );
}
