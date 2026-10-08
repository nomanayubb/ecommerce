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
  tags?: string[];
  video_url?: string | null;
  rating_avg?: string | null;
  rating_count?: number;
}
export interface Variant {
  id: string;
  title: string;
  sku: string;
  price: string;
  stock_quantity: number;
  variant_attributes: Record<string, string>;
  image_index?: number | null;
}
export interface ProductDetail extends ProductSummary {
  description: string | null;
  variants: Variant[];
  priceTiers: { min_qty: number; unit_price: string }[];
  moq: number;
  model_3d_url?: string | null;
  metafields?: Record<string, unknown>;
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

export type Effects = { ripple: boolean; flyToCart: boolean; backToTop: boolean; cookieNotice: boolean; newsletterPopup: boolean; iconBadges: boolean };
export const DEFAULT_EFFECTS: Effects = { ripple: true, flyToCart: true, backToTop: true, cookieNotice: true, newsletterPopup: false, iconBadges: true };
export type Visuals = {
  cursor: "none" | "ring" | "whisk"; background: "none" | "aurora" | "mesh" | "wood" | "marble" | "paper"; transition: "none" | "fade" | "wipe";
  imageHover: "zoom" | "liquid" | "none"; particles: "none" | "herbs" | "spices" | "flour" | "steam" | "sparkles" | "petals" | "snow";
  scrollIndicator: "bar" | "cup"; headerStyle: "flat" | "layered" | "gradient"; loader: "ring" | "stir" | "chop" | "pulse";
  addSplash: boolean; sound: boolean; mascotOutfit: "none" | "chef" | "auto";
};
export const DEFAULT_VISUALS: Visuals = { cursor: "none", background: "none", transition: "none", imageHover: "zoom", particles: "none", scrollIndicator: "bar", headerStyle: "flat", loader: "ring", addSplash: false, sound: false, mascotOutfit: "none" };
export interface Branding {
  name: string; tagline: string; logoUrl: string; logoUrlDark?: string; brandColor: string; brandColorDark: string; accentColor?: string;
  radius: number; font: "system" | "serif" | "rounded" | "mono"; defaultTheme: "light" | "dark" | "oled"; announcement: string; pack?: string; motion?: "off" | "subtle" | "full";
  inkColor?: string; creamColor?: string; darkColor?: string; heroText?: string; promiseText?: string; footerText?: string;
  headingFont?: "inherit" | "system" | "serif" | "rounded" | "mono"; buttonStyle?: "solid" | "outline" | "pill";
  cardStyle?: "classic" | "minimal" | "compact" | "soft"; visuals?: Partial<Visuals>; badgeStyle?: "solid" | "outline" | "pill"; layoutWidth?: "boxed" | "wide" | "full";
  searchHints?: string[]; effects?: Partial<Effects>; announcements?: string[]; headerCta?: { label: string; href: string };
  social?: { instagram?: string; facebook?: string; tiktok?: string; youtube?: string; whatsapp?: string; x?: string };
}
export const DEFAULT_BRANDING: Branding = {
  name: "AVERIXA", tagline: "Your world. Our store.", logoUrl: "/brand/logo-horizontal.webp", logoUrlDark: "/brand/logo-horizontal-dark.webp", brandColor: "#1c1c1e", brandColorDark: "#d4aa46", accentColor: "#b88c2c",
  radius: 2, font: "system", defaultTheme: "dark", announcement: "", pack: "default", motion: "full",
};

export interface FooterConfig { columns: { title: string; links: { label: string; href: string }[] }[]; showNewsletter: boolean; showPerks: boolean; showPayments: boolean; note: string }
export const DEFAULT_FOOTER: FooterConfig = {
  columns: [{ title: "Shop", links: [{ label: "All products", href: "/products" }, { label: "Track your order", href: "/track" }, { label: "My account", href: "/account" }] }],
  showNewsletter: true, showPerks: true, showPayments: true, note: "",
};
export interface Store { freeShippingThreshold: number; shippingFee: number; giftWrapEnabled: boolean; giftWrapFee: number }
export const DEFAULT_STORE: Store = { freeShippingThreshold: 5000, shippingFee: 250, giftWrapEnabled: false, giftWrapFee: 0 };

/** Branding + store rules from the API (cached ~30s), with safe fallbacks if the API is down. */
export const getSite = () =>
  api<{ branding?: Partial<Branding>; store?: Partial<Store>; footer?: Partial<FooterConfig> }>("/settings", { revalidate: 30 })
    // Merge over defaults so an old/partial/cached response can never leave a field undefined.
    .then((r) => ({ branding: { ...DEFAULT_BRANDING, ...r.branding } as Branding, store: { ...DEFAULT_STORE, ...r.store } as Store, footer: { ...DEFAULT_FOOTER, ...r.footer } as FooterConfig }))
    .catch(() => ({ branding: DEFAULT_BRANDING, store: DEFAULT_STORE, footer: DEFAULT_FOOTER }));
