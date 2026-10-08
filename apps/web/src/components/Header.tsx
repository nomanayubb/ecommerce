"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CategoryNode } from "@/lib/api";
import { useCart } from "./CartProvider";

const THEMES = ["light", "dark", "oled"] as const;

function ThemeToggle() {
  const [theme, setTheme] = useState<string>("light");
  useEffect(() => setTheme(document.documentElement.dataset.theme ?? "light"), []);
  const next = () => {
    const t = THEMES[(THEMES.indexOf(theme as any) + 1) % THEMES.length];
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("theme", t); } catch {}
    setTheme(t);
  };
  return <button onClick={next} className="text-sm text-muted" aria-label="Switch theme">{theme}</button>;
}

function MegaItem({ node }: { node: CategoryNode }) {
  return (
    <div className="group relative">
      <Link href={`/products?category=${node.slug}`} className="block py-3 hover:text-brand">{node.name}</Link>
      {node.children.length > 0 && (
        <div className="invisible absolute left-0 top-full z-30 min-w-[220px] rounded border border-line bg-bg p-4 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
          {node.children.map((c) => (
            <div key={c.id} className="mb-2">
              <Link href={`/products?category=${c.slug}`} className="font-medium hover:text-brand">{c.name}</Link>
              <ul className="ml-3 text-sm text-muted">
                {c.children.map((g) => (
                  <li key={g.id}><Link href={`/products?category=${g.slug}`} className="hover:text-brand">{g.name}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header({ categories, brand }: { categories: CategoryNode[]; brand: { name: string; logoUrl: string } }) {
  const { count, setOpen } = useCart();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center py-3 text-lg font-bold">
          {brand.logoUrl && <img src={brand.logoUrl} alt="" className="h-9 w-auto" />}
          <span className={`${brand.logoUrl ? "ml-2 hidden sm:inline" : ""} text-lg font-semibold uppercase tracking-[0.28em]`}>{brand.name}</span>
        </Link>
        <nav className="hidden flex-1 gap-6 text-sm md:flex">
          {categories.map((c) => <MegaItem key={c.id} node={c} />)}
        </nav>
        <form action="/products" className="ml-auto">
          <input name="q" placeholder="Search…" className="rounded border border-line bg-card px-3 py-1 text-sm" />
        </form>
        <ThemeToggle />
        <button onClick={() => setOpen(true)} className="py-3 text-sm" aria-label="Open cart">Cart ({count})</button>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-70" />
    </header>
  );
}
