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
  motion: z.enum(["off", "subtle", "full"]).default("full"),
  pack: z.string().regex(/^[a-z0-9-]{1,40}$/).default("default"),
});
export type Branding = z.infer<typeof brandingSchema>;

/** Commerce rules that were hard-coded: change per store without touching code. */
export const storeSchema = z.object({
  freeShippingThreshold: z.number().int().min(0).max(10_000_000),
  shippingFee: z.number().int().min(0).max(1_000_000),
});
export type Store = z.infer<typeof storeSchema>;
const STORE_DEFAULT: Store = { freeShippingThreshold: 5000, shippingFee: 250 };

const load = async <T>(key: string, fallback?: T) => {
  const { rows } = await pool.query("SELECT value FROM site_settings WHERE key = $1", [key]);
  return (rows[0]?.value ?? fallback) as T;
};

export const loadBranding = () => cached("settings:branding", 60, () => load<Branding>("branding"));
export const loadStore = () => cached("settings:store", 60, () => load<Store>("store", STORE_DEFAULT));

const save = async (key: string, value: unknown) => {
  await pool.query(
    "INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()",
    [key, JSON.stringify(value)]
  );
  await redis.del(`settings:${key}`).catch(() => {});
};
export const saveBranding = (b: Branding) => save("branding", b);
export const saveStore = (s: Store) => save("store", s);

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/settings", async () => {
    const [branding, store] = await Promise.all([loadBranding(), loadStore()]);
    return { branding, store };
  });
};
