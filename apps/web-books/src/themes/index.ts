import type { Branding } from "@/lib/api";
import type { Pack } from "./types";
import { pack as def } from "./packs/default";
import { pack as halloween } from "./packs/halloween";
import { pack as eid } from "./packs/eid";
import { pack as christmas } from "./packs/christmas";
import { pack as blackfriday } from "./packs/blackfriday";
import { pack as independence } from "./packs/independence";

// To add an occasion: create themes/packs/<id>.ts and list it here (and in the admin dropdown list).
export const PACKS: Record<string, Pack> = Object.fromEntries(
  [def, halloween, eid, christmas, blackfriday, independence].map((p) => [p.id, p])
);

/** Branding after the active pack's tokens are applied. Unknown pack ids fall back to default. */
export function applyPack(b: Branding & { pack?: string }): { branding: Branding; pack: Pack } {
  const pack = PACKS[b.pack ?? "default"] ?? def;
  const t = pack.tokens ?? {};
  return {
    pack,
    branding: {
      ...b,
      brandColor: t.brandColor ?? b.brandColor,
      brandColorDark: t.brandColorDark ?? b.brandColorDark,
      defaultTheme: t.defaultTheme ?? b.defaultTheme,
      radius: t.radius ?? b.radius,
      announcement: b.announcement || pack.announcement || "",
    },
  };
}
