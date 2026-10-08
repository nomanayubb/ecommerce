import Link from "next/link";
import type { ReactNode } from "react";
import { pkr, type CategoryNode, type FooterConfig, type Store } from "@/lib/api";
import { Logo } from "./Header";
import { AssistantToggle } from "./Mascot";
import { NewsletterForm } from "./NewsletterForm";
import { CashIcon, FacebookIcon, InstagramIcon, ShieldIcon, SupportIcon, TikTokIcon, TruckIcon, WhatsAppIcon, XIcon, YouTubeIcon } from "./icons";

const perks = (store: Store): [ReactNode, string, string][] => [
  [<TruckIcon key="t" size={26} />, "Free delivery", store.freeShippingThreshold > 0 ? `On orders over ${pkr(store.freeShippingThreshold)}` : "On every order"],
  [<CashIcon key="c" size={26} />, "Cash on delivery", "Pay when it arrives"],
  [<ShieldIcon key="s" size={26} />, "Secure checkout", "Your data stays private"],
  [<SupportIcon key="h" size={26} />, "Easy support", "We reply within a day"],
];

const SOCIALS = [
  ["instagram", "Instagram", InstagramIcon], ["facebook", "Facebook", FacebookIcon], ["tiktok", "TikTok", TikTokIcon],
  ["youtube", "YouTube", YouTubeIcon], ["whatsapp", "WhatsApp", WhatsAppIcon], ["x", "X", XIcon],
] as const;

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const cls = "transition hover:text-accent";
  return href.startsWith("/") ? <Link href={href} className={cls}>{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
}

export function Footer({ brand, categories, store, footer, social }: {
  brand: { name: string; tagline: string; footerText?: string; logoUrl: string; logoUrlDark?: string };
  categories: CategoryNode[]; store: Store; footer: FooterConfig; social: Record<string, string | undefined>;
}) {
  const columns = footer.columns.length
    ? footer.columns
    : [{ title: "Shop", links: [{ label: "All products", href: "/products" }, ...categories.map((c) => ({ label: c.name, href: `/products?category=${c.slug}` }))] }];
  const extra = columns.length + (footer.showPayments ? 1 : 0);
  const links = SOCIALS.filter(([k]) => social[k]);

  return (
    <footer className="mt-24 border-t border-line bg-card">
      {footer.showPerks && (
        <>
          <div className="mx-auto grid max-w-[var(--maxw)] gap-px bg-line px-0 sm:grid-cols-2 lg:grid-cols-4">
            {perks(store).map(([icon, t, d]) => (
              <div key={t} className="flex items-center gap-4 bg-card px-6 py-6">
                <span className="text-fg">{icon}</span>
                <div><p className="eyebrow">{t}</p><p className="mt-1 text-sm text-muted">{d}</p></div>
              </div>
            ))}
          </div>
          <div className="gold-rule" />
        </>
      )}
      <div className="mx-auto grid max-w-[var(--maxw)] gap-10 px-4 py-14 md:[grid-template-columns:1.6fr_repeat(var(--n),1fr)]" style={{ ["--n" as string]: extra }}>
        <div>
          <Logo logo={brand.logoUrl} logoDark={brand.logoUrlDark} name={brand.name} className="h-11 footer-logo-breathe" />
          {brand.tagline && <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{brand.tagline} {brand.footerText}</p>}
          {footer.showNewsletter && <NewsletterForm />}
          {links.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-1" aria-label="Social media">
              {links.map(([k, label, Ic]) => (
                <li key={k}><a href={social[k]} target="_blank" rel="noopener noreferrer" aria-label={`${brand.name} on ${label}`} className="flex h-10 w-10 items-center justify-center border border-line text-fg transition hover:border-accent hover:text-accent"><Ic size={20} /></a></li>
              ))}
            </ul>
          )}
        </div>
        {columns.map((c) => (
          <nav key={c.title} className="text-sm" aria-label={c.title}>
            <p className="eyebrow mb-4">{c.title}</p>
            <ul className="space-y-2 text-muted">{c.links.map((l) => <li key={l.label + l.href}><FooterLink href={l.href}>{l.label}</FooterLink></li>)}</ul>
          </nav>
        ))}
        {footer.showPayments && (
          <div className="text-sm">
            <p className="eyebrow mb-4">Payment</p>
            <p className="text-muted">Cash on delivery</p>
            <p className="mt-1 text-muted/70">More payment methods coming soon.</p>
          </div>
        )}
      </div>
      <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-5 sm:flex-row md:pr-28">
        <p className="text-[0.7rem] uppercase tracking-[0.25em] text-muted">© {new Date().getFullYear()} {brand.name}. All rights reserved.{footer.note ? ` ${footer.note}` : ""}</p>
        <AssistantToggle />
      </div>
    </footer>
  );
}
