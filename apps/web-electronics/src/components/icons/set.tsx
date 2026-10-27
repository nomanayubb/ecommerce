import type { ReactNode } from "react";
import { A, Icon, type Props } from "./index";

/**
 * Extended icon set (kitchen, care, safety, dietary, eco). Same grid, stroke and duotone rules as ./index.
 * `ICON_TAGS` maps a product tag to an icon + label, so adding the tag `dishwasher-safe` to a product shows the
 * icon on its card and page with no code change. Add a row here to support a new tag.
 */
export const WhiskIcon = (p: Props) => <Icon {...p}><path d="M12 15C7.5 15 6 9 8 4M12 15c4.5 0 6-6 4-11M12 15c-2.2 0-2.6-6 0-11M12 15c2.2 0 2.6-6 0-11" /><path d="M12 15v6" stroke={A} /></Icon>;
export const PanIcon = (p: Props) => <Icon {...p}><path d="M3 10h13v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" /><path d="M16 11h5" stroke={A} /></Icon>;
export const KnifeIcon = (p: Props) => <Icon {...p}><path d="M4 20L14 6l4 3-8 11z" /><path d="M14 6l4-3 3 3-3 3" stroke={A} /></Icon>;
export const PotIcon = (p: Props) => <Icon {...p}><path d="M5 9h14v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" /><path d="M2 12h3M19 12h3M10 6h4" stroke={A} /></Icon>;
export const SpatulaIcon = (p: Props) => <Icon {...p}><path d="M8 3h8v8H8z" /><path d="M11 5v4M13 5v4" stroke={A} /><path d="M12 11v10" /></Icon>;
export const FlameIcon = (p: Props) => <Icon {...p}><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" /><path d="M12 18a2 2 0 0 0 2-2" stroke={A} /></Icon>;
export const SnowflakeIcon = (p: Props) => <Icon {...p}><path d="M12 3v18M4.5 7.5l15 9M4.5 16.5l15-9" /><path d="M10 4.5l2 2 2-2M10 19.5l2-2 2 2" stroke={A} /></Icon>;
export const ThermometerIcon = (p: Props) => <Icon {...p}><path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z" /><path d="M12 9v8" stroke={A} /></Icon>;
export const TimerIcon = (p: Props) => <Icon {...p}><circle cx="12" cy="13" r="8" /><path d="M9 2h6" /><path d="M12 13l3-3" stroke={A} /></Icon>;
export const DishwasherIcon = (p: Props) => <Icon {...p}><path d="M4 3h16v18H4z" /><path d="M4 8h16" stroke={A} /><circle cx="12" cy="15" r="3.2" /></Icon>;
export const OvenIcon = (p: Props) => <Icon {...p}><path d="M3 5h18v15H3z" /><path d="M3 9h18" stroke={A} /><path d="M7 12h10v5H7z" /></Icon>;
export const MicrowaveIcon = (p: Props) => <Icon {...p}><path d="M3 6h18v12H3z" /><path d="M6 9h9v6H6z" /><path d="M18 9v6" stroke={A} /></Icon>;
export const InductionIcon = (p: Props) => <Icon {...p}><path d="M3 18h18" /><path d="M4 13c3-6 5 6 8 0s5 6 8 0" stroke={A} /></Icon>;
export const BpaFreeIcon = (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M10 6.5h4V9l1 2v6H9v-6l1-2z" /><path d="M5.5 5.5l13 13" stroke={A} /></Icon>;
export const LeafIcon = (p: Props) => <Icon {...p}><path d="M5 19c0-9 5-14 15-14 0 9-5 14-15 14z" /><path d="M5 19L14 10" stroke={A} /></Icon>;
export const HalalIcon = (p: Props) => <Icon {...p}><path d="M16 4a8 8 0 1 0 4 12A6.5 6.5 0 0 1 16 4z" /><path d="M17 9l.8 1.6 1.7.3-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.3z" stroke={A} /></Icon>;
export const GlutenFreeIcon = (p: Props) => <Icon {...p}><path d="M12 21V8M12 8C10 7 9 5 9 3c2 0 3 2 3 5zM12 8c2-1 3-3 3-5-2 0-3 2-3 5zM12 13c-2-1-4-1-5-3 2-.5 4 .5 5 3zM12 13c2-1 4-1 5-3-2-.5-4 .5-5 3z" /><path d="M4 4l16 16" stroke={A} /></Icon>;
export const RecycleIcon = (p: Props) => <Icon {...p}><path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5" /><path d="M18 3v4h-4M6 21v-4h4" stroke={A} /></Icon>;
export const GiftIcon = (p: Props) => <Icon {...p}><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" /><path d="M12 7C9 3 6 5 8 7M12 7c3-4 6-2 4 0" stroke={A} /></Icon>;
export const MeasureIcon = (p: Props) => <Icon {...p}><path d="M5 5h14l-2 15H7z" /><path d="M7 10h4M7.6 14h3.4" stroke={A} /></Icon>;
/** Difficulty 1-3: bars fill up. */
export const DifficultyIcon = ({ level = 1, ...p }: Props & { level?: 1 | 2 | 3 }) => (
  <Icon {...p}>
    <path d="M5 20v-5M12 20v-9M19 20V6" opacity={0.35} />
    <path d={["M5 20v-5", "M5 20v-5M12 20v-9", "M5 20v-5M12 20v-9M19 20V6"][level - 1]} stroke={A} strokeWidth={3} strokeLinecap="butt" />
  </Icon>
);

export type TagIcon = { icon: (p: Props) => ReactNode; label: string };
export const ICON_TAGS: Record<string, TagIcon> = {
  "dishwasher-safe": { icon: DishwasherIcon, label: "Dishwasher safe" },
  "oven-safe": { icon: OvenIcon, label: "Oven safe" },
  "microwave-safe": { icon: MicrowaveIcon, label: "Microwave safe" },
  "freezer-safe": { icon: SnowflakeIcon, label: "Freezer safe" },
  induction: { icon: InductionIcon, label: "Induction ready" },
  "bpa-free": { icon: BpaFreeIcon, label: "BPA free" },
  vegan: { icon: LeafIcon, label: "Vegan" },
  halal: { icon: HalalIcon, label: "Halal" },
  "gluten-free": { icon: GlutenFreeIcon, label: "Gluten free" },
  eco: { icon: RecycleIcon, label: "Eco friendly" },
  gift: { icon: GiftIcon, label: "Gift ready" },
};

/** One icon with an instant tooltip (also works on keyboard focus and for screen readers). */
export function IconTip({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const t = ICON_TAGS[name];
  if (!t) return null;
  const I = t.icon;
  return (
    <span tabIndex={0} role="img" aria-label={t.label} className={`icon-tip icon-anim ${className}`} data-tip={t.label}>
      <I size={size} />
    </span>
  );
}

/** Row of the icons a product's tags map to. Renders nothing when there are none. */
export function TagIcons({ tags, size = 20, max = 6, className = "" }: { tags?: string[]; size?: number; max?: number; className?: string }) {
  const names = (tags ?? []).filter((t) => ICON_TAGS[t]).slice(0, max);
  if (!names.length) return null;
  return <span className={`inline-flex items-center gap-2 ${className}`}>{names.map((n) => <IconTip key={n} name={n} size={size} />)}</span>;
}
