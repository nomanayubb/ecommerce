"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CategoryNode } from "@/lib/api";
import { useCart } from "./CartProvider";

const THEMES = ["dark", "oled", "light"] as const;
const ICONS: Record<string, string> = { dark: "◐", oled: "●", light: "○" };

export function Logo({ logo, logoDark, name, className = "h-9" }: { logo: string; logoDark?: string; name: string; className?: string }) {
  if (!logo) return <span className="text-lg font-semibold uppercase tracking-[0.3em]">{name}</span>;
  return (
    <>
      <img src={logo} alt={name} width={185} height={36} className={`logo-on-light w-auto ${className}`} />
      <img src={logoDark || logo} alt={name} width={185} height={36} className={`logo-on-dark w-auto ${className}`} />
    </>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<string>("dark");
  useEffect(() => setTheme(document.documentElement.dataset.theme ?? "dark"), []);
  const next = () => {
    const t = THEMES[(THEMES.indexOf(theme as (typeof THEMES)[number]) + 1) % THEMES.length];
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("theme", t); } catch {}
    setTheme(t);
  };
  return (
    <button onClick={next} className="px-2 py-3 text-base text-muted transition hover:text-accent" aria-label={`Theme: ${theme}. Click to change`} title={`Theme: ${theme}`}>
      {ICONS[theme] ?? "◐"}
    </button>
  );
}

function MegaItem({ node }: { node: CategoryNode }) {
  return (
    <div className="group relative">
      <Link href={`/products?category=${node.slug}`} className="relative block py-5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] transition hover:text-accent">
        {node.name}
        <span className="absolute inset-x-0 bottom-3 h-px origin-left scale-x-0 bg-accent transition-transform group-hover:scale-x-100" />
      </Link>
      {node.children.length > 0 && (
        <div className="invisible absolute left-0 top-full z-30 min-w-[260px] translate-y-1 border border-line bg-card p-5 opacity-0 shadow-2xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
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
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4">
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none py-3 text-xl" aria-label="Menu">☰</summary>
          <nav className="absolute left-0 top-full w-64 border border-line bg-card p-4 text-sm shadow-2xl">
            {categories.map((c) => (
              <Link key={c.id} href={`/products?category=${c.slug}`} className="block py-2 uppercase tracking-widest">{c.name}</Link>
            ))}
            <Link href="/products" className="block py-2 uppercase tracking-widest text-accent">All products</Link>
          </nav>
        </details>
        <Link href="/" className="flex items-center py-3" aria-label={brand.name}>
          <Logo logo={brand.logoUrl} logoDark={brand.logoUrlDark} name={brand.name} />
        </Link>
        <nav className="hidden flex-1 justify-center gap-8 md:flex">
          {categories.map((c) => <MegaItem key={c.id} node={c} />)}
        </nav>
        <form action="/products" className="ml-auto hidden sm:block">
          <input name="q" placeholder="Search" aria-label="Search products" className="w-36 border-b border-line bg-transparent px-1 py-1 text-sm outline-none transition-all placeholder:text-muted focus:w-52 focus:border-accent" />
        </form>
        <ThemeToggle />
        <button onClick={() => setOpen(true)} className="relative py-3 pl-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em] transition hover:text-accent" aria-label={`Open cart, ${count} items`}>
          Bag
          <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.65rem] leading-5 text-onbrand">{count}</span>
        </button>
      </div>
    </header>
  );
}
