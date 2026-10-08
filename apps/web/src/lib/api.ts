const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface ProductSummary {
  id: string;
  title: string;
  slug: string;
  marked_price: string;
  selling_price: string;
  stock_quantity: number;
  images: string[];
  brand_name: string | null;
  discount_pct: string | null;
}
export interface Variant {
  id: string;
  title: string;
  sku: string;
  price: string;
  stock_quantity: number;
  variant_attributes: Record<string, string>;
}
export interface ProductDetail extends ProductSummary {
  description: string | null;
  variants: Variant[];
  priceTiers: { min_qty: number; unit_price: string }[];
  moq: number;
}
export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children: CategoryNode[];
}

export async function api<T>(path: string, init?: RequestInit & { revalidate?: number }): Promise<T> {
  const { revalidate = 30, ...rest } = init ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { "content-type": "application/json", ...rest.headers },
    ...(rest.method && rest.method !== "GET" ? { cache: "no-store" } : { next: { revalidate } }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export const pkr = (n: number | string) => `Rs. ${Number(n).toLocaleString("en-PK")}`;

export interface Branding {
  name: string; tagline: string; logoUrl: string; logoUrlDark?: string; brandColor: string; brandColorDark: string; accentColor?: string;
  radius: number; font: "system" | "serif" | "rounded" | "mono"; defaultTheme: "light" | "dark" | "oled"; announcement: string; pack?: string;
}
export const DEFAULT_BRANDING: Branding = {
  name: "AVERIXA", tagline: "Your world. Our store.", logoUrl: "/brand/logo-horizontal.webp", logoUrlDark: "/brand/logo-horizontal-dark.webp", brandColor: "#1c1c1e", brandColorDark: "#d4aa46", accentColor: "#b88c2c",
  radius: 2, font: "system", defaultTheme: "dark", announcement: "", pack: "default",
};
