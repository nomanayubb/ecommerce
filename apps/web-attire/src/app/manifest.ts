import type { MetadataRoute } from "next";
import { getSite } from "@/lib/api";

/** Makes the shop installable on a phone's home screen. Name, colours and icons follow the brand settings. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { branding: b } = await getSite();
  const dark = /^#[0-9a-fA-F]{6}$/.test(b.darkColor ?? "") ? b.darkColor! : "#0f0f11";
  return {
    name: b.name, short_name: b.name.slice(0, 12), description: b.tagline, start_url: "/", scope: "/", display: "standalone",
    background_color: dark, theme_color: dark,
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
