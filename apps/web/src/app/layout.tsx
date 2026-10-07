import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { api, type CategoryNode } from "@/lib/api";
import { CartProvider } from "@/components/CartProvider";
import { CartDrawer } from "@/components/CartDrawer";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Store", description: "Online store" };

// Runs before first paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const categories = await api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => []);
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <CartProvider>
          <Header categories={categories} />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
