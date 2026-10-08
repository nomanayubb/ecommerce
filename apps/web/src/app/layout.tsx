import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { api, getSite, type CategoryNode } from "@/lib/api";
import { brandingCss } from "@/lib/branding";
import { applyPack } from "@/themes";
import { Decor } from "@/components/Decor";
import { CartProvider } from "@/components/CartProvider";
import { CartDrawer } from "@/components/CartDrawer";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollProgress } from "@/components/Motion";
import { SiteProvider } from "@/components/Site";

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
const themeScript = `document.documentElement.classList.add("js");try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [categories, site] = await Promise.all([
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => []),
    getSite(),
  ]);
  const { branding, pack } = applyPack(site.branding);
  const { store } = site;
  const logos = { logoUrl: branding.logoUrl, logoUrlDark: branding.logoUrlDark };
  return (
    <html lang="en" data-theme={branding.defaultTheme} data-motion={branding.motion ?? "full"} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandingCss(branding) }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ScrollProgress />
        <Decor decor={pack.decor} />
        <SiteProvider value={{ branding, store }}>
        <CartProvider>
          {branding.announcement && (
            <div className="bg-darksurface px-4 py-2 text-center text-[0.68rem] font-medium uppercase tracking-[0.25em] text-gold">
              {branding.announcement}
            </div>
          )}
          <Header categories={categories} brand={{ name: branding.name, ...logos }} />
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
          <Footer brand={{ name: branding.name, tagline: branding.tagline, footerText: branding.footerText, ...logos }} categories={categories} store={store} />
          <CartDrawer />
        </CartProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
