import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { api, getSite, DEFAULT_VISUALS, type CategoryNode } from "@/lib/api";
import { PARTICLE_PRESETS } from "@/themes/presets";
import { brandingCss } from "@/lib/branding";
import { applyPack } from "@/themes";
import { Decor } from "@/components/Decor";
import { LiveRegion } from "@/components/LiveRegion";
import { LazyCompareTray, LazyDrawer, LazyIdleHosts, LazyQuickView } from "@/components/LazyHosts";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ScrollProgress } from "@/components/Motion";
import { SiteProvider } from "@/components/Site";
import { SessionProvider } from "@/components/SessionProvider";
import { ShopperProvider } from "@/components/Shopper";

const getBranding = () => getSite().then((s) => s.branding);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
/** Organisation + site-search data for search engines. */
const siteLd = (name: string, tagline: string) => [
  { "@context": "https://schema.org", "@type": "Organization", name, url: SITE_URL, logo: `${SITE_URL}/brand/icon-512.png`, description: tagline },
  { "@context": "https://schema.org", "@type": "WebSite", name, url: SITE_URL, potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/products?q={search_term_string}`, "query-input": "required name=search_term_string" } },
];

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  const desc = b.tagline || b.name;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: `${b.name} | ${desc}`, template: `%s | ${b.name}` },
    description: desc,
    icons: { icon: "/favicon.ico", apple: "/brand/apple-touch-icon.png" },
    openGraph: { title: b.name, description: desc, siteName: b.name, type: "website", images: ["/brand/og-image.jpg"] },
    twitter: { card: "summary_large_image", title: b.name, description: desc, images: ["/brand/og-image.jpg"] },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const b = await getBranding();
  return { themeColor: /^#[0-9a-fA-F]{6}$/.test(b.darkColor ?? "") ? b.darkColor : "#0f0f11" };
}

// Runs before first paint so the saved theme never flashes.
const themeScript = `var d=document.documentElement;d.classList.add("js");try{var c=navigator.connection;if(c&&(c.saveData||/(^|-)2g$/.test(c.effectiveType||"")))d.dataset.lite="1";var t=localStorage.getItem("theme");if(t==="auto")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";if(t)d.dataset.theme=t;var a=JSON.parse(localStorage.getItem("a11y")||"null");if(a){if(a.size&&a.size!==100)d.style.fontSize=a.size+"%";if(a.contrast)d.setAttribute("data-contrast","");if(a.underline)d.setAttribute("data-underline","");if(a.dyslexia)d.setAttribute("data-dyslexia","");if(a.lite)d.dataset.lite="1"}var m=localStorage.getItem("motion-pref");if(m)d.dataset.motionPref=m;else if(d.dataset.motionPolicy==="always")d.dataset.motionPref="on"}catch(e){if(d.dataset.motionPolicy==="always")d.dataset.motionPref="on"}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [categories, site] = await Promise.all([
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => []),
    getSite(),
  ]);
  // Menus get only the top level; each drop-down loads its own branch when opened, so the page stays light.
  const topCats: CategoryNode[] = categories.map((c) => ({ ...c, hasChildren: c.children.length > 0, children: [] }));
  const { branding, pack } = applyPack(site.branding);
  const { store, footer } = site;
  const messages = (branding.announcements?.length ? branding.announcements : branding.announcement ? [branding.announcement] : []).filter(Boolean);
  const visuals = { ...DEFAULT_VISUALS, ...branding.visuals };
  // A theme pack's own particles win; otherwise the store's chosen particle look.
  const decor = pack.decor?.particles || visuals.particles === "none" ? pack.decor : { ...pack.decor, particles: PARTICLE_PRESETS[visuals.particles] };
  const logos = { logoUrl: branding.logoUrl, logoUrlDark: branding.logoUrlDark };
  return (
    <html lang="en" data-theme={branding.defaultTheme} data-motion={branding.motion ?? "full"} data-motion-policy={branding.motionPolicy ?? "respect"} data-button={branding.buttonStyle ?? "solid"} data-card={branding.cardStyle ?? "classic"} data-badge={branding.badgeStyle ?? "solid"} data-bg={visuals.background === "none" ? undefined : visuals.background} data-header={visuals.headerStyle} data-depth={visuals.depth === "soft" ? "soft" : undefined} data-imghover={visuals.imageHover} data-stage={visuals.cardStage === "square" ? "square" : undefined} data-sound={visuals.sound ? "1" : "0"} data-voice={visuals.mascotVoice ? "1" : "0"} data-logomorph={visuals.logoMorph ? "1" : undefined} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandingCss(branding) }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd(branding.name, branding.tagline)).replace(/</g, "\\u003c") }} />
        {visuals.imageHover === "liquid" && (
          <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
            <filter id="liquid" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" result="n"><animate attributeName="baseFrequency" dur="6s" values="0.012 0.018;0.02 0.026;0.012 0.018" repeatCount="indefinite" /></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="16" /></filter>
          </svg>
        )}
        <LiveRegion />
        <ScrollProgress mode={visuals.scrollIndicator} />
        <Decor decor={decor} />
        <SiteProvider value={{ branding, store }}>
        <SessionProvider>
        <CartProvider>
        <ShopperProvider>
          <AnnouncementBar messages={messages} />
          <Header categories={topCats} brand={{ name: branding.name, ...logos }} cta={branding.headerCta} hints={branding.searchHints} />
          <main id="main" tabIndex={-1} className="mx-auto max-w-[var(--maxw)] px-4 py-8 outline-none">{children}</main>
          <Footer brand={{ name: branding.name, tagline: branding.tagline, footerText: branding.footerText, ...logos }} categories={topCats} store={store} footer={footer} social={branding.social ?? {}} />
          <LazyDrawer />
          <LazyQuickView />
          <LazyCompareTray />
          <LazyIdleHosts effects={branding.effects} brandName={branding.name} visuals={visuals} />
        </ShopperProvider>
        </CartProvider>
        </SessionProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
