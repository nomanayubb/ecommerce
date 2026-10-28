"use client";

import { useSite } from "./Site";
import { ICON_TAGS, IconTip } from "./icons/set";

/** Product tag icons (dishwasher safe, vegan, ...). Hidden when the store turns "icon badges" off in Settings. */
export function TagIcons({ tags, size = 20, max = 6, className = "", labels = false }: { tags?: string[]; size?: number; max?: number; className?: string; labels?: boolean }) {
  const { branding } = useSite();
  if (branding.effects?.iconBadges === false) return null;
  const names = (tags ?? []).filter((t) => ICON_TAGS[t]).slice(0, max);
  if (!names.length) return null;
  if (labels) {
    return (
      <ul className={`flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted ${className}`}>
        {names.map((n) => <li key={n} className="icon-anim flex items-center gap-2"><span className="text-fg">{ICON_TAGS[n].icon({ size })}</span>{ICON_TAGS[n].label}</li>)}
      </ul>
    );
  }
  return <span className={`inline-flex items-center gap-2 ${className}`}>{names.map((n) => <IconTip key={n} name={n} size={size} />)}</span>;
}
