const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface ProductSummary {
  show_add_to_cart?: boolean | null;
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
  recipe_count?: number;
  moq?: number;
  has_variants?: boolean;
  is_new?: boolean;
  sold_30d?: number;
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
  image_url?: string | null;
  hasChildren?: boolean;
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

export type Effects = { ripple: boolean; flyToCart: boolean; backToTop: boolean; cookieNotice: boolean; newsletterPopup: boolean; iconBadges: boolean; whatsappButton: boolean };
export const DEFAULT_EFFECTS: Effects = { ripple: true, flyToCart: true, backToTop: true, cookieNotice: true, newsletterPopup: false, iconBadges: true, whatsappButton: false };
export type Visuals = {
  cursor: "none" | "ring" | "whisk"; background: "none" | "atmosphere" | "aurora" | "mesh" | "wood" | "marble" | "paper"; depth: "flat" | "soft"; transition: "none" | "fade" | "wipe";
  imageHover: "zoom" | "liquid" | "none"; particles: "none" | "herbs" | "spices" | "flour" | "steam" | "sparkles" | "petals" | "snow";
  scrollIndicator: "bar" | "cup"; headerStyle: "flat" | "layered" | "gradient" | "peek"; loader: "ring" | "stir" | "chop" | "pulse" | "mascot";
  addSplash: boolean; sound: boolean; mascotOutfit: "none" | "chef" | "auto";
  mascotVoice: boolean; splash: boolean; logoMorph: boolean; logoSparkles: boolean; watermark: boolean; cardGlow: boolean; priceCountUp: boolean;
};
export const DEFAULT_VISUALS: Visuals = { cursor: "none", background: "none", depth: "flat", transition: "none", imageHover: "zoom", particles: "none", scrollIndicator: "bar", headerStyle: "flat", loader: "ring", addSplash: false, sound: false, mascotOutfit: "none", mascotVoice: false, splash: false, logoMorph: false, logoSparkles: false, watermark: false, cardGlow: false, priceCountUp: false };
export interface Branding {
  name: string; tagline: string; logoUrl: string; logoUrlDark?: string; brandColor: string; brandColorDark: string; accentColor?: string;
  radius: number; font: "system" | "serif" | "rounded" | "mono"; defaultTheme: "light" | "dark" | "oled"; announcement: string; pack?: string; motion?: "off" | "subtle" | "full";
  inkColor?: string; creamColor?: string; darkColor?: string; heroText?: string; promiseText?: string; footerText?: string;
  headingFont?: "inherit" | "system" | "serif" | "rounded" | "mono"; buttonStyle?: "solid" | "outline" | "pill";
  cardStyle?: "classic" | "minimal" | "compact" | "soft"; visuals?: Partial<Visuals>; badgeStyle?: "solid" | "outline" | "pill"; layoutWidth?: "boxed" | "wide" | "full";
  motionPolicy?: "respect" | "always"; searchHints?: string[]; navLinks?: { label: string; href: string }[]; effects?: Partial<Effects>; announcements?: string[]; headerCta?: { label: string; href: string };
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
export interface Pdp { showAddToCart: boolean; showBuyNow: boolean; showAddress: boolean; imageSide: "left" | "right"; galleryThumbs: "side" | "below"; showShare: boolean; showSaveCompare: boolean; showRating: boolean; showLiveViewers: boolean; showDetails: boolean; showTags: boolean; showSku: boolean; showTrustIcons: boolean; showDispatch: boolean; showBenefits: boolean; showReviews: boolean; showQuestions: boolean; showRecipes: boolean; showRelated: boolean; showRecentlyViewed: boolean; showSectionTabs: boolean; stickyInfo: boolean }
export const DEFAULT_PDP: Pdp = { showAddToCart: true, showBuyNow: false, showAddress: true, imageSide: "left", galleryThumbs: "side", showShare: true, showSaveCompare: true, showRating: true, showLiveViewers: true, showDetails: true, showTags: true, showSku: true, showTrustIcons: true, showDispatch: true, showBenefits: true, showReviews: true, showQuestions: true, showRecipes: true, showRelated: true, showRecentlyViewed: true, showSectionTabs: true, stickyInfo: true };
export type FieldMode = "required" | "optional" | "hidden";
export interface PayMethod { id: "COD" | "EASYPAISA" | "JAZZCASH" | "BANK_TRANSFER"; label: string; description: string; instructions: string; enabled: boolean }
export interface Store { pdp?: Partial<Pdp>; checkoutFields?: Record<"email" | "phone" | "address" | "city" | "postalCode" | "note", FieldMode>; paymentMethods?: PayMethod[]; freeShippingThreshold: number; shippingFee: number; dispatchCutoff: number; deliveryMinDays: number; deliveryMaxDays: number; giftWrapEnabled: boolean; giftWrapFee: number }
export const DEFAULT_STORE: Store = { freeShippingThreshold: 5000, shippingFee: 250, dispatchCutoff: 0, deliveryMinDays: 2, deliveryMaxDays: 4, giftWrapEnabled: false, giftWrapFee: 0 };

/** Branding + store rules from the API (cached ~30s), with safe fallbacks if the API is down. */
export const getSite = () =>
  api<{ branding?: Partial<Branding>; store?: Partial<Store>; footer?: Partial<FooterConfig> }>("/settings", { revalidate: 30 })
    // Merge over defaults so an old/partial/cached response can never leave a field undefined.
    .then((r) => ({ branding: { ...DEFAULT_BRANDING, ...r.branding } as Branding, store: { ...DEFAULT_STORE, ...r.store } as Store, footer: { ...DEFAULT_FOOTER, ...r.footer } as FooterConfig }))
    .catch(() => ({ branding: DEFAULT_BRANDING, store: DEFAULT_STORE, footer: DEFAULT_FOOTER }));
