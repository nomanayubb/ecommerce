"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { send } from "@/lib/client";
import { motionAllowed } from "@/lib/motion";
import { CloseIcon } from "./icons";
import { useSession } from "./SessionProvider";

/* ------------------------------------------------------------------ meta shapes (see api/routes/productsAdmin.ts) */
export type SizeGuide = { note: string; columns: string[]; rows: string[][] };
export type Meta = {
  videoUrl?: string; spinImages?: string[]; sizeGuide?: SizeGuide | null;
  specs?: { label: string; value: string }[]; care?: string[]; material?: string; materialNote?: string;
};

/* ------------------------------------------------------------------ video */
function embedUrl(u: string): string | null {
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return vm ? `https://player.vimeo.com/video/${vm[1]}?dnt=1` : null;
}
export function VideoPlayer({ url, poster, title }: { url: string; poster?: string; title: string }) {
  const embed = embedUrl(url);
  if (embed) return <iframe src={embed} title={`${title} video`} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="h-full w-full border-0" />;
  return <video src={url} poster={poster} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" aria-label={`${title} video`} />;
}

/* ------------------------------------------------------------------ 360 viewer */
/** Drag, swipe or use arrow keys to turn the product. Frames are one full turn, in order. */
export function Spin360({ frames, title }: { frames: string[]; title: string }) {
  const [i, setI] = useState(0);
  const drag = useRef<{ x: number; i: number } | null>(null);
  const [hint, setHint] = useState(true);
  const n = frames.length;
  const wrap = (k: number) => ((k % n) + n) % n;

  useEffect(() => { frames.forEach((s) => { const im = new Image(); im.src = s; }); }, [frames]);
  // One gentle half-turn on first view to show it is interactive.
  useEffect(() => {
    if (!motionAllowed() || n < 8) return;
    let k = 0;
    const t = setInterval(() => { k++; setI((c) => wrap(c + 1)); if (k >= Math.min(12, Math.floor(n / 2))) clearInterval(t); }, 90);
    return () => clearInterval(t);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="relative h-full w-full cursor-grab select-none touch-pan-y active:cursor-grabbing" tabIndex={0} role="img" aria-label={`${title}, 360 degree view. Use left and right arrow keys to turn.`}
      onPointerDown={(e) => { drag.current = { x: e.clientX, i }; setHint(false); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { if (drag.current) setI(wrap(drag.current.i - Math.round((e.clientX - drag.current.x) / 14))); }}
      onPointerUp={() => { drag.current = null; }}
      onKeyDown={(e) => { if (e.key === "ArrowRight") { setI((c) => wrap(c + 1)); setHint(false); } if (e.key === "ArrowLeft") { setI((c) => wrap(c - 1)); setHint(false); } }}
    >
      <img src={frames[i]} alt="" draggable={false} className="h-full w-full object-cover" />
      {hint && <span className="glass pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em]">Drag to rotate</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ 3D / AR */
/** Loads Google's model-viewer only when the 3D tab is opened. Shows an "AR" button on phones that support it. */
export function Model3D({ src, poster, title }: { src: string; poster?: string; title: string }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    import("@google/model-viewer").then(() => setReady(true)).catch(() => setFailed(true));
  }, []);
  if (failed) return <p className="p-6 text-sm text-muted">The 3D viewer could not load on this device.</p>;
  if (!ready) return <p className="grid h-full place-items-center text-xs uppercase tracking-widest text-muted">Loading 3D…</p>;
  return createElement("model-viewer", {
    src, poster, alt: `${title} in 3D`, ar: true, "ar-modes": "webxr scene-viewer quick-look", "camera-controls": true, "touch-action": "pan-y",
    "auto-rotate": motionAllowed() ? true : undefined, "shadow-intensity": "1", style: { width: "100%", height: "100%", background: "transparent" },
  });
}

/* ------------------------------------------------------------------ size guide + finder */
const range = (cell: string): [number, number] | null => {
  const m = cell.replace(/,/g, ".").match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (m) return [Number(m[1]), Number(m[2])];
  const s = cell.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
  return s ? [Number(s[1]), Number(s[1])] : null;
};

export function SizeGuideButton({ guide, title }: { guide: SizeGuide; title: string }) {
  const [open, setOpen] = useState(false);
  const [col, setCol] = useState(1);
  const [val, setVal] = useState("");
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open]);

  const numeric = guide.columns.map((_, c) => c > 0 && guide.rows.some((r) => range(r[c] ?? "")));
  const v = Number(val.replace(",", "."));
  let fit: string | null = null;
  if (v > 0 && numeric[col]) {
    let best = { d: Infinity, size: "" };
    for (const r of guide.rows) {
      const rg = range(r[col] ?? "");
      if (!rg) continue;
      const d = v < rg[0] ? rg[0] - v : v > rg[1] ? v - rg[1] : 0;
      if (d < best.d) best = { d, size: r[0] };
    }
    fit = best.size ? (best.d === 0 ? `Your size: ${best.size}` : `Closest size: ${best.size}${best.d > 5 ? " (you are between sizes, check the next one too)" : ""}`) : null;
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold uppercase tracking-[0.2em] text-accent underline-offset-4 hover:underline">Size guide</button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={`${title} size guide`} className="fade-up relative max-h-[90vh] w-full max-w-lg overflow-y-auto border border-line bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Close size guide" onClick={() => setOpen(false)} className="absolute right-3 top-3 p-2 hover:text-accent"><CloseIcon size={18} /></button>
            <p className="eyebrow">Size guide</p>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead><tr>{guide.columns.map((c) => <th key={c} className="border-b border-line px-2 py-2 text-xs uppercase tracking-widest text-muted">{c}</th>)}</tr></thead>
                <tbody>{guide.rows.map((r) => <tr key={r[0]} className={fit?.includes(`: ${r[0]}`) ? "bg-accent/10 text-accent" : ""}>{guide.columns.map((_, c) => <td key={c} className="border-b border-line px-2 py-2">{r[c] ?? ""}</td>)}</tr>)}</tbody>
              </table>
            </div>
            {numeric.some(Boolean) && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="eyebrow mb-3 !text-[0.65rem]">Find my size</p>
                <div className="flex gap-2">
                  <select value={col} onChange={(e) => setCol(Number(e.target.value))} aria-label="Measurement" className="flex-1 border border-line bg-transparent px-3 py-2 text-sm">
                    {guide.columns.map((c, i) => numeric[i] ? <option key={c} value={i}>{c}</option> : null)}
                  </select>
                  <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" placeholder="Your measurement" aria-label="Your measurement" className="w-36 border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-accent" />
                </div>
                {fit && <p role="status" className="mt-3 text-sm font-semibold text-accent">{fit}</p>}
              </div>
            )}
            {guide.note && <p className="mt-5 text-sm text-muted">{guide.note}</p>}
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ specs, material, care */
export function SpecsTable({ specs }: { specs: { label: string; value: string }[] }) {
  return <dl className="divide-y divide-line text-sm">{specs.map((s) => <div key={s.label} className="flex justify-between gap-4 py-2"><dt className="text-muted">{s.label}</dt><dd className="text-right">{s.value}</dd></div>)}</dl>;
}

/** Numbered care steps that draw in one after the other when opened. */
export function CareSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3 text-sm">
      {steps.map((s, i) => (
        <li key={i} className="fade-up flex gap-3" style={{ animationDelay: `${i * 90}ms` }}>
          <span className="grid h-6 w-6 shrink-0 place-items-center border border-accent text-xs font-semibold text-accent">{i + 1}</span>
          <span className="pt-0.5 text-muted">{s}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ live viewers (real: counts pages that pinged in the last 45 s) */
export function LiveViewers({ slug }: { slug: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let sid = "";
    try { sid = sessionStorage.getItem("sid") ?? ""; if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem("sid", sid); } } catch { sid = crypto.randomUUID(); }
    const ping = () => { if (document.visibilityState === "visible") send<{ viewers: number }>("POST", "presence/ping", { slug, sid }).then((r) => setN(r.viewers)).catch(() => {}); };
    ping();
    const t = setInterval(ping, 20_000);
    return () => clearInterval(t);
  }, [slug]);
  if (n < 2) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-muted" role="status">
      <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-accent" /></span>
      {n} people are looking at this right now
    </p>
  );
}

/* ------------------------------------------------------------------ questions & answers */
type QA = { id: string; name: string; question: string; answer: string | null; created_at: string };
export function ProductQA({ slug }: { slug: string }) {
  const { user } = useSession();
  const [items, setItems] = useState<QA[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { send<{ items: QA[] }>("GET", `products/${slug}/qa`).then((r) => setItems(r.items)).catch(() => {}); }, [slug]);

  async function ask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setMsg(null);
    try {
      const r = await send<{ message: string }>("POST", `products/${slug}/qa`, { name: f.get("name"), question: f.get("question") });
      setMsg({ ok: true, text: r.message });
      (e.target as HTMLFormElement).reset();
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not send" }); }
    setBusy(false);
  }
  const field = "w-full border border-line bg-card px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent";
  return (
    <section id="questions" className="mt-20 border-t border-line pt-12">
      <p className="eyebrow">Questions</p>
      <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">Questions &amp; answers</h2>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-6">
          {items.length === 0 && <li className="text-sm text-muted">No questions yet. Ask the first one.</li>}
          {items.map((q) => (
            <li key={q.id} className="border-b border-line pb-6">
              <p className="font-medium">Q: {q.question}</p>
              <p className="mt-1 text-xs text-muted">Asked by {q.name} · {new Date(q.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
              {q.answer && <p className="mt-3 border-l-2 border-accent pl-4 text-sm text-muted"><strong className="text-fg">Answer from the shop:</strong> {q.answer}</p>}
            </li>
          ))}
        </ul>
        <form onSubmit={ask} className="h-fit space-y-3 border border-line bg-card p-5">
          <p className="eyebrow !text-[0.65rem]">Ask a question</p>
          <input name="name" required maxLength={80} defaultValue={user?.firstName ?? ""} placeholder="Your name" aria-label="Your name" className={field} />
          <textarea name="question" required minLength={5} maxLength={500} rows={3} placeholder="What would you like to know about this product?" aria-label="Your question" className={field} />
          <button disabled={busy} className="btn btn-primary w-full disabled:opacity-50">{busy ? "Sending…" : "Send question"}</button>
          {msg && <p role="status" className={`text-xs ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
        </form>
      </div>
    </section>
  );
}
