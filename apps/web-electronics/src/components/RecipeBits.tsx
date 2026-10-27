import Link from "next/link";
import type { RecipeCardData } from "@/lib/content";
import { fmtMinutes, totalMinutes } from "@/lib/content";
import { DifficultyIcon, TimerIcon } from "./icons/set";

const LEVEL = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;
const WORD = { EASY: "Easy", MEDIUM: "Medium", HARD: "Advanced" } as const;

/** Icon + word for how hard a recipe is. */
export function DifficultyBadge({ level, className = "" }: { level: RecipeCardData["difficulty"]; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-widest ${className}`} title={`Difficulty: ${WORD[level]}`}>
      <DifficultyIcon level={LEVEL[level]} size={16} />{WORD[level]}
    </span>
  );
}

/** Total time with the prep/cook split shown on hover. */
export function TimeBadge({ prep, cook, className = "" }: { prep: number; cook: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-widest ${className}`} title={`${prep} min prep + ${cook} min cooking`}>
      <TimerIcon size={16} />{fmtMinutes(prep + cook)}
    </span>
  );
}

/** Recipe card that flips to a short summary on hover or keyboard focus (fine pointers only; touch shows the front). */
export function RecipeCard({ r }: { r: RecipeCardData }) {
  return (
    <Link href={`/recipes/${r.slug}`} className="rflip group block outline-none" aria-label={`${r.title}, ${fmtMinutes(totalMinutes(r))}, ${WORD[r.difficulty]}`}>
      <div className="rflip-inner relative aspect-[4/5]">
        <div className="rflip-face absolute inset-0 flex flex-col overflow-hidden border border-line bg-card">
          <div className="relative flex-1 overflow-hidden bg-line/40">
            <img src={r.image_url || `/ph/${r.slug}`} alt="" loading="lazy" width={600} height={600} className="h-full w-full object-cover" />
            {r.matchPct != null && <span className="absolute left-0 top-3 bg-gold px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-darksurface">{r.matchPct}% match</span>}
            {r.featured && r.matchPct == null && <span className="glass absolute left-3 top-3 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em]">Featured</span>}
          </div>
          <div className="p-4">
            <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5">{r.title}</h3>
            <div className="mt-2 flex items-center justify-between text-muted"><DifficultyBadge level={r.difficulty} /><TimeBadge prep={r.prep_minutes} cook={r.cook_minutes} /></div>
          </div>
        </div>
        <div className="rflip-face rflip-back absolute inset-0 flex flex-col justify-between border border-accent bg-card p-5">
          <div>
            <p className="eyebrow !text-[0.6rem]">{r.seasons[0] ?? "Recipe"}</p>
            <h3 className="mt-2 text-base font-semibold leading-snug">{r.title}</h3>
            <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-muted">{r.summary || "Open the recipe for ingredients, steps and timers."}</p>
            {!!r.missing?.length && <p className="mt-3 text-xs text-muted">You still need: {r.missing.slice(0, 4).join(", ")}{r.missing.length > 4 ? "…" : ""}</p>}
          </div>
          <div>
            <p className="mb-2 text-xs text-muted">Serves {r.servings} · {r.prep_minutes} min prep + {r.cook_minutes} min cooking</p>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">View recipe →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
