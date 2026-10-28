import { StarIcon } from "./icons";

/** Read-only star rating (gold = filled). Accessible label carries the value. */
export function Stars({ value, size = 16, count }: { value: number; size?: number; count?: number }) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`${value.toFixed(1)} out of 5${count != null ? `, ${count} reviews` : ""}`}>
      <span className="inline-flex">{[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} size={size} filled={i <= filled} className={i <= filled ? "" : "text-line"} />)}</span>
      {count != null && <span className="text-xs text-muted">({count})</span>}
    </span>
  );
}
