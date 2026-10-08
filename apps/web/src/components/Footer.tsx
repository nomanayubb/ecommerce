import Link from "next/link";
import type { ReactNode } from "react";
import { pkr, type CategoryNode, type Store } from "@/lib/api";
import { Logo } from "./Header";
import { AssistantToggle } from "./Mascot";
import { CashIcon, SupportIcon, TruckIcon, ShieldIcon } from "./icons";

const perks = (store: Store): [ReactNode, string, string][] => [
  [<TruckIcon key="t" size={26} />, "Free delivery", store.freeShippingThreshold > 0 ? `On orders over ${pkr(store.freeShippingThreshold)}` : "On every order"],
  [<CashIcon key="c" size={26} />, "Cash on delivery", "Pay when it arrives"],
  [<ShieldIcon key="s" size={26} />, "Secure checkout", "Your data stays private"],
  [<SupportIcon key="h" size={26} />, "Easy support", "We reply within a day"],
];

export function Footer({ brand, categories, store }: { brand: { name: string; tagline: string; footerText?: string; logoUrl: string; logoUrlDark?: string }; categories: CategoryNode[]; store: Store }) {
  return (
    <footer className="mt-24 border-t border-line bg-card">
      <div className="mx-auto grid max-w-7xl gap-px bg-line px-0 sm:grid-cols-2 lg:grid-cols-4">
        {perks(store).map(([icon, t, d]) => (
          <div key={t} className="flex items-center gap-4 bg-card px-6 py-6">
            <span className="text-fg">{icon}</span>
            <div><p className="eyebrow">{t}</p><p className="mt-1 text-sm text-muted">{d}</p></div>
          </div>
        ))}
      </div>
      <div className="gold-rule" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo logo={brand.logoUrl} logoDark={brand.logoUrlDark} name={brand.name} className="h-11" />
          {brand.tagline && <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{brand.tagline} {brand.footerText}</p>}
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
      <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-5 sm:flex-row md:pr-28">
        <p className="text-[0.7rem] uppercase tracking-[0.25em] text-muted">
        © {new Date().getFullYear()} {brand.name}. All rights reserved.
      </p>
        <AssistantToggle />
      </div>
    </footer>
  );
}
