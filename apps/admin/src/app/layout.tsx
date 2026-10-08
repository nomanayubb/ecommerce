import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false }, icons: { icon: "/favicon.ico", apple: "/brand/apple-touch-icon.png" } };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
