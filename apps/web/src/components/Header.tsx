"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CategoryNode } from "@/lib/api";
import { useCart } from "./CartProvider";
import { BagIcon, ContrastIcon, MenuIcon, SearchIcon } from "./icons";

const THEMES = ["dark", "oled", "light"] as const;

export function Logo({ logo, logoDark, name, className = "h-9" }: { logo: string; logoDark?: string; name: string; className?: string }) {
  if (!logo) return <span className="text-lg font-semibold uppercase tracking-[0.3em]">{name}</span>;
  return (
    <>
      <img src={logo} alt={name} width={185} height={36} className={`logo-on-light w-auto max-w-none ${className}`} />
      <img src={logoDark || logo} alt={name} width={185} height={36} className={`logo-on-dark w-auto max-w-none ${className}`} />
    </>
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

export function Header({ categories, brand }: { categories: CategoryNode[]; brand: { name: string; logoUrl: string; logoUrlDark?: string } }) {
  const { count, setOpen } = useCart();
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
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 sm:gap-5">
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none p-2" aria-label="Menu"><MenuIcon size={22} /></summary>
          <nav className="absolute left-0 top-full w-64 border border-line bg-card p-4 text-sm shadow-2xl">
            {categories.map((c) => (
              <Link key={c.id} href={`/products?category=${c.slug}`} className="block py-2 uppercase tracking-widest">{c.name}</Link>
            ))}
            <Link href="/products" className="block py-2 uppercase tracking-widest text-accent">All products</Link>
            <div className="mt-2 border-t border-line pt-2"><ThemeToggle labelled className="!px-0" /></div>
          </nav>
        </details>
        <Link href="/" className="logo-reveal flex shrink-0 items-center py-3" aria-label={brand.name}>
          <Logo logo={brand.logoUrl} logoDark={brand.logoUrlDark} name={brand.name} className="h-7 sm:h-9" />
        </Link>
        <nav className="hidden flex-1 justify-center gap-8 md:flex">
          {categories.map((c) => <MegaItem key={c.id} node={c} />)}
        </nav>
        <form action="/products" className="relative ml-auto hidden lg:block" role="search">
          <SearchIcon size={16} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" placeholder="Search" aria-label="Search products" className="w-36 border-b border-line bg-transparent py-1 pl-6 pr-1 text-sm outline-none transition-all placeholder:text-muted focus:w-52 focus:border-accent" />
        </form>
        <Link href="/products" className="ml-auto p-2 text-muted transition hover:text-accent lg:hidden" aria-label="Search"><SearchIcon size={20} /></Link>
        <ThemeToggle className="hidden sm:flex" />
        <button onClick={() => setOpen(true)} className="relative flex items-center gap-2 p-2 transition hover:text-accent" aria-label={`Open bag, ${count} items`}>
          <BagIcon size={22} />
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.65rem] font-semibold leading-5 text-onbrand">{count}</span>
        </button>
      </div>
    </header>
  );
}
