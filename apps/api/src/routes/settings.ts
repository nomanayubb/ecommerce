import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { cached, redis } from "../lib/redis.js";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
// Only http(s) or site-relative URLs: the value is rendered into an <img src>.
const url = z.string().max(500).refine((v) => v === "" || /^(https?:\/\/|\/)/.test(v), "Must be http(s) or a /path");
const text = (max: number) => z.string().max(max).default("");

/** Brand kit: everything visual/verbal that changes between projects. The palette generates every colour token. */
export const brandingSchema = z.object({
  name: z.string().min(1).max(60),
  tagline: z.string().max(160),
  logoUrl: url,
  logoUrlDark: url.default(""),
  // Palette: ink (text/primary on light), cream (light page), charcoal (dark page + hero), gold tones (accent)
  brandColor: hex,
  brandColorDark: hex,
  accentColor: hex.default("#b88c2c"),
  inkColor: hex.default("#1e1e20"),
  creamColor: hex.default("#faf6ee"),
  darkColor: hex.default("#0f0f11"),
  radius: z.number().int().min(0).max(28),
  font: z.enum(["system", "serif", "rounded", "mono"]),
  defaultTheme: z.enum(["light", "dark", "oled"]),
  announcement: z.string().max(200),
  heroText: text(300),
  promiseText: text(300),
  footerText: text(300),
  headingFont: z.enum(["inherit", "system", "serif", "rounded", "mono"]).default("inherit"),
  buttonStyle: z.enum(["solid", "outline", "pill"]).default("solid"),
  cardStyle: z.enum(["classic", "minimal", "compact", "soft", "catalog"]).default("classic"),
  badgeStyle: z.enum(["solid", "outline", "pill"]).default("solid"),
  layoutWidth: z.enum(["boxed", "wide", "full"]).default("boxed"),
  announcements: z.array(z.string().trim().max(200)).max(5).default([]),
  headerCta: z.object({ label: z.string().trim().max(30).default(""), href: url.default("") }).default({}),
  social: z.object({
    instagram: url.default(""), facebook: url.default(""), tiktok: url.default(""),
    youtube: url.default(""), whatsapp: url.default(""), x: url.default(""),
  }).default({}),
  navLinks: z.array(z.object({ label: z.string().trim().min(1).max(30), href: url })).max(12).default([]),
  searchHints: z.array(z.string().trim().max(40)).max(6).default([]),
  effects: z.object({
    ripple: z.boolean().default(true),
    flyToCart: z.boolean().default(true),
    backToTop: z.boolean().default(true),
    cookieNotice: z.boolean().default(true),
    newsletterPopup: z.boolean().default(false),
    iconBadges: z.boolean().default(true),
    whatsappButton: z.boolean().default(false),
  }).default({}),
  visuals: z.object({
    cursor: z.enum(["none", "ring", "whisk"]).default("none"),
    background: z.enum(["none", "atmosphere", "aurora", "mesh", "wood", "marble", "paper"]).default("none"),
    depth: z.enum(["flat", "soft"]).default("flat"),
    transition: z.enum(["none", "fade", "wipe"]).default("none"),
    imageHover: z.enum(["zoom", "liquid", "none"]).default("zoom"),
    cardStage: z.enum(["round", "square"]).default("round"),
    particles: z.enum(["none", "herbs", "spices", "flour", "steam", "sparkles", "petals", "snow"]).default("none"),
    scrollIndicator: z.enum(["bar", "cup"]).default("bar"),
    headerStyle: z.enum(["flat", "layered", "gradient", "peek"]).default("flat"),
    loader: z.enum(["ring", "stir", "chop", "pulse", "mascot"]).default("ring"),
    addSplash: z.boolean().default(false),
    sound: z.boolean().default(false),
    mascotVoice: z.boolean().default(false),
    splash: z.boolean().default(false),
    logoMorph: z.boolean().default(false),
    logoSparkles: z.boolean().default(false),
    watermark: z.boolean().default(false),
    cardGlow: z.boolean().default(false),
    priceCountUp: z.boolean().default(false),
    mascotOutfit: z.enum(["none", "chef", "auto"]).default("none"),
  }).default({}),
  motion: z.enum(["off", "subtle", "full"]).default("full"),
  motionPolicy: z.enum(["respect", "always"]).default("respect"),
  pack: z.string().regex(/^[a-z0-9-]{1,40}$/).default("default"),
});
export type Branding = z.infer<typeof brandingSchema>;

/** Commerce rules that were hard-coded: change per store without touching code. */
const fieldMode = z.enum(["required", "optional", "hidden"]);
/** Which boxes the checkout form shows, and which of them the shopper must fill. Name is always required. */
export const checkoutFieldsSchema = z.object({
  email: fieldMode.default("hidden"), phone: fieldMode.default("required"), address: fieldMode.default("required"),
  city: fieldMode.default("required"), postalCode: fieldMode.default("optional"), note: fieldMode.default("optional"),
  // The address boxes (joined into one address line): each can be required, optional or hidden on its own. `address` above is worked out from them (see loadStore).
  house: fieldMode.default("required"), street: fieldMode.default("required"), area: fieldMode.default("required"), extra: fieldMode.default("optional"),
});
export type CheckoutFields = z.infer<typeof checkoutFieldsSchema>;
export const DEFAULT_CHECKOUT_FIELDS: CheckoutFields = { email: "hidden", phone: "required", address: "required", city: "required", postalCode: "optional", note: "optional", house: "required", street: "required", area: "required", extra: "optional" };

const payMethod = z.object({
  id: z.enum(["COD", "EASYPAISA", "JAZZCASH", "BANK_TRANSFER"]),
  label: z.string().trim().min(1).max(40),
  description: z.string().trim().max(200).default(""),
  instructions: z.string().trim().max(500).default(""),
  enabled: z.boolean(),
});
export type PayMethod = z.infer<typeof payMethod>;
export const DEFAULT_PAYMENTS: PayMethod[] = [
  { id: "COD", label: "Cash on delivery", description: "Pay the courier when your order arrives.", instructions: "", enabled: true },
  { id: "EASYPAISA", label: "EasyPaisa", description: "Send the amount from your EasyPaisa app.", instructions: "", enabled: false },
  { id: "JAZZCASH", label: "JazzCash", description: "Send the amount from your JazzCash app.", instructions: "", enabled: false },
  { id: "BANK_TRANSFER", label: "Bank transfer", description: "Transfer to our bank account.", instructions: "", enabled: false },
];

/** Product page layout: which blocks show and how the photos sit. Defaults match the original page. */
export const pdpSchema = z.object({
  imageSide: z.enum(["left", "right"]).default("left"),
  galleryThumbs: z.enum(["side", "below"]).default("side"),
  showAddToCart: z.boolean().default(true),
  showBuyNow: z.boolean().default(false),
  showAddress: z.boolean().default(true),
  showShare: z.boolean().default(true),
  showSaveCompare: z.boolean().default(true),
  showRating: z.boolean().default(true),
  showLiveViewers: z.boolean().default(true),
  showDetails: z.boolean().default(true),
  showTags: z.boolean().default(true),
  showSku: z.boolean().default(true),
  showTrustIcons: z.boolean().default(true),
  showDispatch: z.boolean().default(true),
  showBenefits: z.boolean().default(true),
  showReviews: z.boolean().default(true),
  showQuestions: z.boolean().default(true),
  showRecipes: z.boolean().default(true),
  showRelated: z.boolean().default(true),
  showRecentlyViewed: z.boolean().default(true),
  showSectionTabs: z.boolean().default(true),
  stickyInfo: z.boolean().default(true),
});
export type PdpSettings = z.infer<typeof pdpSchema>;
export const DEFAULT_PDP: PdpSettings = pdpSchema.parse({});

/** Boxes the shop owner adds to the checkout form from the admin (for example "Alternate phone", "Preferred delivery time"). Answers are saved with the order. */
export const customFieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]{1,30}$/),
  label: z.string().trim().min(1).max(60),
  type: z.enum(["text", "textarea", "select", "number", "checkbox"]).default("text"),
  required: z.boolean().default(false),
  placeholder: z.string().trim().max(80).default(""),
  options: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});
export type CustomField = z.infer<typeof customFieldSchema>;

export const storeSchema = z.object({
  freeShippingThreshold: z.number().int().min(0).max(10_000_000),
  shippingFee: z.number().int().min(0).max(1_000_000),
  dispatchCutoff: z.number().int().min(0).max(23).default(0),
  deliveryMinDays: z.number().int().min(0).max(30).default(2),
  deliveryMaxDays: z.number().int().min(0).max(30).default(4),
  giftWrapEnabled: z.boolean().default(false),
  giftWrapFee: z.number().int().min(0).max(100_000).default(0),
  checkoutFields: checkoutFieldsSchema.default(DEFAULT_CHECKOUT_FIELDS),
  /** Checkout city box: false = pick from the TCS city list only, true = customers may type any city (the TCS list is offered as suggestions). */
  allowManualCity: z.boolean().default(false),
  customFields: z.array(customFieldSchema).max(12).default([]),
  paymentMethods: z.array(payMethod).max(8).default(DEFAULT_PAYMENTS),
  pdp: pdpSchema.default(DEFAULT_PDP),
  headerMenuCount: z.number().int().min(1).max(12).default(4),
  /** Stock rule (see lib/stock.ts): off = always show `shown`, never count down; onDelivery / onOrder = real stock counting down. */
  stock: z.object({
    countDown: z.enum(["off", "onDelivery", "onOrder"]).default("off"),
    shown: z.number().int().min(1).max(1_000_000).default(9999),
    sellWhenOut: z.boolean().default(true),
  }).default({ countDown: "off", shown: 9999, sellWhenOut: true }),
});
export type Store = z.infer<typeof storeSchema>;
const STORE_DEFAULT: Store = { freeShippingThreshold: 5000, shippingFee: 250, dispatchCutoff: 0, deliveryMinDays: 2, deliveryMaxDays: 4, giftWrapEnabled: false, giftWrapFee: 0, checkoutFields: DEFAULT_CHECKOUT_FIELDS, allowManualCity: false, customFields: [], paymentMethods: DEFAULT_PAYMENTS, pdp: DEFAULT_PDP, headerMenuCount: 4, stock: { countDown: "off", shown: 9999, sellWhenOut: true } };

const load = async <T>(key: string, fallback?: T) => {
  const { rows } = await pool.query("SELECT value FROM site_settings WHERE key = $1", [key]);
  return (rows[0]?.value ?? fallback) as T;
};

/** Footer builder: link columns + switches. */
export const footerSchema = z.object({
  columns: z.array(z.object({
    title: z.string().trim().max(40),
    links: z.array(z.object({ label: z.string().trim().min(1).max(40), href: url })).max(8),
  })).max(4),
  showNewsletter: z.boolean().default(true),
  showPerks: z.boolean().default(true),
  showPayments: z.boolean().default(true),
  note: z.string().trim().max(200).default(""),
});
export type FooterSettings = z.infer<typeof footerSchema>;
export const DEFAULT_FOOTER: FooterSettings = {
  columns: [{ title: "Shop", links: [{ label: "All products", href: "/products" }, { label: "Track your order", href: "/track" }, { label: "My account", href: "/account" }] }],
  showNewsletter: true, showPerks: true, showPayments: true, note: "",
};

/** The order's address line is built from house, street, area and extra: it is required when any of the first three is required, otherwise optional when any box shows, otherwise hidden. */
const withAddressMode = (f: CheckoutFields): CheckoutFields => {
  const parts = [f.house, f.street, f.area, f.extra];
  const address = [f.house, f.street, f.area].includes("required") ? "required" : parts.some((m) => m !== "hidden") ? "optional" : "hidden";
  return { ...f, address };
};

export const loadBranding = () => cached("settings:branding", 60, () => load<Branding>("branding"));
export const loadFooter = () => cached("settings:footer", 60, () => load<FooterSettings>("footer", DEFAULT_FOOTER));
export const loadStore = () => cached("settings:store", 60, async () => {
  const saved = await load<Partial<Store>>("store", {});
  // Nested groups are merged key by key so settings added later still get their defaults.
  return { ...STORE_DEFAULT, ...saved, pdp: { ...DEFAULT_PDP, ...(saved.pdp ?? {}) }, stock: { ...STORE_DEFAULT.stock, ...(saved.stock ?? {}) }, checkoutFields: withAddressMode({ ...DEFAULT_CHECKOUT_FIELDS, ...(saved.checkoutFields ?? {}) }) };
});

const save = async (key: string, value: unknown) => {
  await pool.query(
    "INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()",
    [key, JSON.stringify(value)]
  );
  await redis.del(`settings:${key}`).catch(() => {});
};
export const saveBranding = (b: Branding) => save("branding", b);
export const saveStore = (s: Store) => save("store", s);
export const saveFooter = (f: FooterSettings) => save("footer", f);

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/settings", async () => {
    const [branding, store, footer] = await Promise.all([loadBranding(), loadStore(), loadFooter()]);
    return { branding, store, footer };
  });
};
