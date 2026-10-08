import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { api, DEFAULT_BRANDING, type Branding, type CategoryNode } from "@/lib/api";
import { brandingCss } from "@/lib/branding";
import { applyPack } from "@/themes";
import { Decor } from "@/components/Decor";
import { CartProvider } from "@/components/CartProvider";
import { CartDrawer } from "@/components/CartDrawer";
import { Header } from "@/components/Header";

const getBranding = () =>
  api<{ branding: Branding }>("/settings", { revalidate: 30 }).then((r) => r.branding).catch(() => DEFAULT_BRANDING);

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  return { title: { default: b.name, template: `%s | ${b.name}` }, description: b.tagline || b.name };
}

// Runs before first paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [categories, saved] = await Promise.all([
    api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => []),
    getBranding(),
  ]);
  const { branding, pack } = applyPack(saved);
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
            <div className="bg-brand px-4 py-2 text-center text-sm text-white">{branding.announcement}</div>
          )}
          <Header categories={categories} brand={{ name: branding.name, logoUrl: branding.logoUrl }} />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
