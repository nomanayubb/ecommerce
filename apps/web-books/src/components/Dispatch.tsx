"use client";

import { useEffect, useState } from "react";
import { useSite } from "./Site";
import { TruckIcon } from "./icons";

/** Skips Sundays, like the courier does. */
function addWorkingDays(from: Date, days: number) {
  const d = new Date(from);
  let left = days;
  while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) left--; }
  return d;
}
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/**
 * "Order within 2 h 14 m for same-day dispatch" and "Arrives Thu 16 Oct to Sat 18 Oct", from Settings > Delivery rules.
 * Renders nothing until the browser knows the time (no server/browser mismatch) and when the shop left both off.
 */
export function DispatchNote({ compact = false }: { compact?: boolean }) {
  const { store } = useSite();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  if (!now) return null;
  const cutoff = store.dispatchCutoff;
  let dispatch: string | null = null;
  let start = now;
  if (cutoff > 0) {
    const end = new Date(now); end.setHours(cutoff, 0, 0, 0);
    const open = now < end && now.getDay() !== 0;
    if (open) {
      const mins = Math.max(1, Math.round((end.getTime() - now.getTime()) / 60000));
      dispatch = `Order within ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} m` : `${mins} m`} for same-day dispatch`;
    } else { dispatch = "Orders now ship on the next working day"; start = new Date(now); start.setDate(start.getDate() + 1); if (start.getDay() === 0) start.setDate(start.getDate() + 1); }
  }
  const min = store.deliveryMinDays, max = store.deliveryMaxDays;
  const promise = max > 0 ? `Arrives ${fmt(addWorkingDays(start, min))}${max > min ? ` to ${fmt(addWorkingDays(start, max))}` : ""}` : null;
  if (!dispatch && !promise) return null;
  return (
    <div className={`flex items-start gap-3 text-sm ${compact ? "" : "border border-line bg-card/50 p-4"}`} role="status">
      <TruckIcon size={20} className="mt-0.5 shrink-0 text-accent" />
      <p className="leading-relaxed">{dispatch && <span className="block font-medium">{dispatch}</span>}{promise && <span className="block text-muted">{promise}</span>}</p>
    </div>
  );
}
