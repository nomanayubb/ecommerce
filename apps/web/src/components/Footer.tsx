import Link from "next/link";
import type { CategoryNode } from "@/lib/api";
import { Logo } from "./Header";

const PERKS = [
  ["Free delivery", "On orders over Rs. 5,000"],
  ["Cash on delivery", "Pay when it arrives"],
  ["Secure checkout", "Your data stays private"],
  ["Easy support", "We reply within a day"],
];

export function Footer({ brand, categories }: { brand: { name: string; tagline: string; logoUrl: string; logoUrlDark?: string }; categories: CategoryNode[] }) {
  return (
    <footer className="mt-24 border-t border-line bg-card">
      <div className="mx-auto grid max-w-7xl gap-px bg-line px-0 sm:grid-cols-2 lg:grid-cols-4">
        {PERKS.map(([t, d]) => (
          <div key={t} className="bg-card px-6 py-6">
            <p className="eyebrow">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </div>
      <div className="gold-rule" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo logo={brand.logoUrl} logoDark={brand.logoUrlDark} name={brand.name} className="h-11" />
          {brand.tagline && <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{brand.tagline} Curated products, honest prices and delivery you can count on.</p>}
        </div>
        <nav className="text-sm">
          <p className="eyebrow mb-4">Shop</p>
          <ul className="space-y-2 text-muted">
            <li><Link href="/products" className="hover:text-accent">All products</Link></li>
            {categories.map((c) => <li key={c.id}><Link href={`/products?category=${c.slug}`} className="hover:text-accent">{c.name}</Link></li>)}
          </ul>
        </nav>
        <div className="text-sm">
          <p className="eyebrow mb-4">Payment</p>
          <p className="text-muted">Cash on delivery</p>
          <p className="mt-1 text-muted/70">More payment methods coming soon.</p>
        </div>
      </div>
      <p className="border-t border-line py-5 text-center text-[0.7rem] uppercase tracking-[0.25em] text-muted">
        © {new Date().getFullYear()} {brand.name}. All rights reserved.
      </p>
    </footer>
  );
}
