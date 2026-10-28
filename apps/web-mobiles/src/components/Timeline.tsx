import { CheckIcon } from "./icons";

export interface TimelineData { closed: string | null; steps: { key: string; label: string; done: boolean; current: boolean }[] }

/** Order progress: Placed -> Processing -> Shipped -> Delivered (or Canceled / Refunded). */
export function Timeline({ timeline }: { timeline: TimelineData }) {
  if (timeline.closed)
    return <p className="border border-line bg-card px-4 py-3 text-sm uppercase tracking-[0.2em] text-muted">Order {timeline.closed.toLowerCase()}</p>;
  return (
    <ol className="grid gap-4 sm:grid-cols-4" aria-label="Order progress">
      {timeline.steps.map((s) => (
        <li key={s.key} className="flex items-center gap-3 sm:flex-col sm:items-start" aria-current={s.current ? "step" : undefined}>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center border ${s.done ? "border-accent bg-accent text-onbrand" : "border-line text-muted"}`}>
            {s.done ? <CheckIcon size={18} className="[&_*]:stroke-current" /> : <span className="text-xs">{timeline.steps.indexOf(s) + 1}</span>}
          </span>
          <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${s.current ? "text-accent" : s.done ? "" : "text-muted"}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
