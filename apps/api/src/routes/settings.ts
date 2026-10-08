import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { cached, redis } from "../lib/redis.js";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
// Only http(s) or site-relative URLs: the value is rendered into an <img src>.
const url = z.string().max(500).refine((v) => v === "" || /^(https?:\/\/|\/)/.test(v), "Must be http(s) or a /path");

export const brandingSchema = z.object({
  name: z.string().min(1).max(60),
  tagline: z.string().max(160),
  logoUrl: url,
  logoUrlDark: url.default(""),
  brandColor: hex,
  brandColorDark: hex,
  accentColor: hex.default("#b88c2c"),
  radius: z.number().int().min(0).max(28),
  font: z.enum(["system", "serif", "rounded", "mono"]),
  defaultTheme: z.enum(["light", "dark", "oled"]),
  announcement: z.string().max(200),
  motion: z.enum(["off", "subtle", "full"]).default("full"),
  pack: z.string().regex(/^[a-z0-9-]{1,40}$/).default("default"),
});
export type Branding = z.infer<typeof brandingSchema>;

export const loadBranding = () =>
  cached("settings:branding", 60, async () => {
    const { rows } = await pool.query("SELECT value FROM site_settings WHERE key = 'branding'");
    return rows[0].value as Branding;
  });

export const saveBranding = async (b: Branding) => {
  await pool.query(
    "UPDATE site_settings SET value = $1, updated_at = now() WHERE key = 'branding'",
    [JSON.stringify(b)]
  );
  await redis.del("settings:branding").catch(() => {});
};

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/settings", async () => ({ branding: await loadBranding() }));
};
