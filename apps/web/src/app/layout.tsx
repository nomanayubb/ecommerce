import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { api, DEFAULT_BRANDING, type Branding, type CategoryNode } from "@/lib/api";
import { brandingCss } from "@/lib/branding";
import { applyPack } from "@/themes";
import { Decor } from "@/components/Decor";
import { CartProvider } from "@/components/CartProvider";
import { CartDrawer } from "@/components/CartDrawer";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const getBranding = () =>
  api<{ branding: Branding }>("/settings", { revalidate: 30 }).then((r) => r.branding).catch(() => DEFAULT_BRANDING);

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

export const viewport: Viewport = { themeColor: "#0f0f11" };

// Runs before first paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [categories, saved] = await Promise.all([
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => []),
    getBranding(),
  ]);
  const { branding, pack } = applyPack(saved);
  const logos = { logoUrl: branding.logoUrl, logoUrlDark: branding.logoUrlDark };
  return (
    <html lang="en" data-theme={branding.defaultTheme} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandingCss(branding) }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Decor decor={pack.decor} />
        <CartProvider>
          {branding.announcement && (
            <div className="bg-[#0f0f11] px-4 py-2 text-center text-[0.68rem] font-medium uppercase tracking-[0.25em] text-[#d4aa46]">
              {branding.announcement}
            </div>
          )}
          <Header categories={categories} brand={{ name: branding.name, ...logos }} />
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
          <Footer brand={{ name: branding.name, tagline: branding.tagline, ...logos }} categories={categories} />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
