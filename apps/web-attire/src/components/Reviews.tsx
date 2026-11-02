"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { send } from "@/lib/client";
import { Stars } from "./Stars";
import { StarIcon } from "./icons";
import { useSession } from "./SessionProvider";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface Review { id: string; rating: number; title: string | null; body: string; verified: boolean; helpful_count: number; created_at: string; author: string }
interface Data { summary: { count: number; average: number; distribution: number[] }; items: Review[] }

export function Reviews({ slug }: { slug: string }) {
  const { user, ready } = useSession();
  const [data, setData] = useState<Data | null>(null);
  const [rating, setRating] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  const load = useCallback(() => fetch(`${BASE}/products/${slug}/reviews`, { cache: "no-store" }).then((r) => r.json()).then(setData).catch(() => {}), [slug]);
  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) return setMsg({ ok: false, text: "Please choose a star rating" });
    const f = new FormData(e.currentTarget);
    setBusy(true); setMsg(null);
    try {
      const r = await send<{ message: string }>("POST", `products/${slug}/reviews`, { rating, title: String(f.get("title") || "") || undefined, body: String(f.get("body")) });
      setMsg({ ok: true, text: r.message });
      (e.target as HTMLFormElement).reset(); setRating(0);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not submit review" });
    } finally { setBusy(false); }
  }

  async function helpful(id: string) {
    try { await send("POST", `reviews/${id}/helpful`); setVoted((v) => new Set(v).add(id)); load(); } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not record vote" }); }
  }

  const s = data?.summary;
  const field = "w-full border border-line bg-card px-4 py-3 text-sm outline-none transition focus:border-accent";
  return (
    <section id="reviews" className="mt-24" aria-label="Customer reviews">
      <div className="mb-8"><p className="eyebrow">Customer reviews</p><h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">What people say</h2></div>
      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <div>
          {s && s.count > 0 ? (
            <>
              <p className="text-5xl font-semibold">{s.average.toFixed(1)}</p>
              <div className="mt-2"><Stars value={s.average} size={20} count={s.count} /></div>
              <ul className="mt-5 space-y-2 text-xs text-muted">
                {s.distribution.map((n, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="w-6">{5 - i} ★</span><span className="h-1.5 flex-1 bg-line"><span className="block h-1.5 bg-accent" style={{ width: `${(n / s.count) * 100}%` }} /></span><span className="w-5 text-right">{n}</span></li>
                ))}
              </ul>
            </>
          ) : <p className="text-sm text-muted">No reviews yet. Be the first to share your thoughts.</p>}
        </div>

        <div>
          <ul className="divide-y divide-line">
            {data?.items.map((r) => (
              <li key={r.id} className="py-6 first:pt-0">
                <div className="flex flex-wrap items-center gap-3"><Stars value={r.rating} size={15} />{r.verified && <span className="border border-accent px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-accent">Verified buyer</span>}</div>
                {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                <p className="mt-1 text-sm leading-relaxed text-muted">{r.body}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                  <span>{r.author} · {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <button onClick={() => (user ? helpful(r.id) : undefined)} disabled={voted.has(r.id)} className="uppercase tracking-[0.15em] transition hover:text-accent disabled:text-accent" title={user ? "" : "Sign in to vote"}>
                    Helpful ({r.helpful_count + 0})
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 border border-line bg-card p-6">
            <h3 className="eyebrow mb-4">Write a review</h3>
            {ready && !user ? (
              <p className="text-sm text-muted"><Link href={`/login?next=/products/${slug}`} className="text-accent hover:underline">Sign in</Link> to review this product.</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setRating(i)} className="p-0.5 transition hover:scale-110"><StarIcon size={28} filled={i <= rating} className={i <= rating ? "" : "text-line"} /></button>
                  ))}
                </div>
                <input name="title" maxLength={120} placeholder="Headline (optional)" className={field} />
                <textarea name="body" required minLength={10} maxLength={2000} rows={4} placeholder="What did you like or dislike?" className={field} />
                {msg && <p role="status" className={`text-sm ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
                <button disabled={busy || !user} className="btn btn-primary disabled:opacity-50">{busy ? "Sending…" : "Submit review"}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
