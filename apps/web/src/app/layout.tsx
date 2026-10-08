import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { api, getSite, DEFAULT_VISUALS, type CategoryNode } from "@/lib/api";
import { PARTICLE_PRESETS } from "@/themes/presets";
import { VisualsHost } from "@/components/Visuals";
import { brandingCss } from "@/lib/branding";
import { applyPack } from "@/themes";
import { Decor } from "@/components/Decor";
import { CartProvider } from "@/components/CartProvider";
import { CartDrawer } from "@/components/CartDrawer";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ScrollProgress } from "@/components/Motion";
import { SiteProvider } from "@/components/Site";
import { SessionProvider } from "@/components/SessionProvider";
import { ShopperProvider } from "@/components/Shopper";
import { QuickView } from "@/components/QuickView";
import { CompareTray } from "@/components/CompareTray";
import { MascotAssistant } from "@/components/Mascot";
import { ConfettiHost } from "@/components/Confetti";
import { EffectsHost } from "@/components/Effects";

const getBranding = () => getSite().then((s) => s.branding);

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
const themeScript = `document.documentElement.classList.add("js");try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t;var m=localStorage.getItem("motion-pref");if(m)document.documentElement.dataset.motionPref=m}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [categories, site] = await Promise.all([
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => []),
    getSite(),
  ]);
  const { branding, pack } = applyPack(site.branding);
  const { store, footer } = site;
  const messages = (branding.announcements?.length ? branding.announcements : branding.announcement ? [branding.announcement] : []).filter(Boolean);
  const visuals = { ...DEFAULT_VISUALS, ...branding.visuals };
  // A theme pack's own particles win; otherwise the store's chosen particle look.
  const decor = pack.decor?.particles || visuals.particles === "none" ? pack.decor : { ...pack.decor, particles: PARTICLE_PRESETS[visuals.particles] };
  const logos = { logoUrl: branding.logoUrl, logoUrlDark: branding.logoUrlDark };
  return (
    <html lang="en" data-theme={branding.defaultTheme} data-motion={branding.motion ?? "full"} data-button={branding.buttonStyle ?? "solid"} data-card={branding.cardStyle ?? "classic"} data-badge={branding.badgeStyle ?? "solid"} data-bg={visuals.background === "none" ? undefined : visuals.background} data-header={visuals.headerStyle} data-imghover={visuals.imageHover} data-sound={visuals.sound ? "1" : "0"} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandingCss(branding) }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {visuals.imageHover === "liquid" && (
          <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
            <filter id="liquid" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" result="n"><animate attributeName="baseFrequency" dur="6s" values="0.012 0.018;0.02 0.026;0.012 0.018" repeatCount="indefinite" /></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="16" /></filter>
          </svg>
        )}
        <ScrollProgress mode={visuals.scrollIndicator} />
        <Decor decor={decor} />
        <SiteProvider value={{ branding, store }}>
        <SessionProvider>
        <CartProvider>
        <ShopperProvider>
          <AnnouncementBar messages={messages} />
          <Header categories={categories} brand={{ name: branding.name, ...logos }} cta={branding.headerCta} hints={branding.searchHints} />
          <main className="mx-auto max-w-[var(--maxw)] px-4 py-8">{children}</main>
          <Footer brand={{ name: branding.name, tagline: branding.tagline, footerText: branding.footerText, ...logos }} categories={categories} store={store} footer={footer} social={branding.social ?? {}} />
          <CartDrawer />
          <QuickView />
          <CompareTray />
          <MascotAssistant />
          <ConfettiHost />
          <EffectsHost effects={branding.effects} brandName={branding.name} />
          <VisualsHost visuals={visuals} />
        </ShopperProvider>
        </CartProvider>
        </SessionProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
