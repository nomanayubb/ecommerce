"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { pkr } from "@/lib/api";
import { motionAllowed } from "@/lib/motion";
import { send } from "@/lib/client";
import { CloseIcon, SearchIcon } from "./icons";

type Suggest = {
  products: { title: string; slug: string; image: string | null; selling_price: string; stock_quantity: number; discount_pct: string | null }[];
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
};
type Row = { key: string; href: string; label: string; kind: "product" | "category" | "brand" | "recent" | "trend" | "all" };

const RECENT = "recent-searches";
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT) ?? "[]"); } catch { return []; } };
const writeRecent = (q: string) => {
  try { localStorage.setItem(RECENT, JSON.stringify([q, ...readRecent().filter((x) => x !== q)].slice(0, 6))); } catch {}
};

type SR = { start(): void; stop(): void; lang: string; interimResults: boolean; onresult: ((e: { results: { 0: { 0: { transcript: string } } } & ArrayLike<unknown> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

/**
 * Header search: rotating placeholder, instant suggestions with thumbnails, recent + trending searches,
 * keyboard navigation and voice input (where the browser supports it).
 */
export function SearchBox({ hints, className, panelClass = "" }: { hints?: string[]; className: string; panelClass?: string }) {
  const router = useRouter();
  const id = useId();
  const box = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggest | null>(null);
  const [trend, setTrend] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [listening, setListening] = useState(false);
  const [canVoice, setCanVoice] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const list = hints?.length ? hints : ["Search"];

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setCanVoice(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  // Rotating placeholder (only while idle and when motion is allowed).
  useEffect(() => {
    if (list.length < 2 || open) return;
    const t = setInterval(() => { if (motionAllowed()) setHintIdx((n) => (n + 1) % list.length); }, 3200);
    return () => clearInterval(t);
  }, [list.length, open]);

  // Close when clicking elsewhere.
  useEffect(() => {
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    addEventListener("pointerdown", away);
    return () => removeEventListener("pointerdown", away);
  }, []);

  // Load trending once, recents on open.
  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    if (!trend.length) send<{ terms: string[] }>("GET", "search/trending").then((r) => setTrend(r.terms)).catch(() => {});
  }, [open, trend.length]);

  // Debounced suggestions.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) { setData(null); return; }
    const t = setTimeout(() => {
      send<Suggest>("GET", `search/suggest?q=${encodeURIComponent(q)}`).then(setData).catch(() => setData(null));
    }, 180);
    return () => clearTimeout(t);
  }, [value]);

  const q = value.trim();
  const rows: Row[] = [];
  if (q.length >= 2 && data) {
    data.products.forEach((p) => rows.push({ key: `p-${p.slug}`, href: `/products/${p.slug}`, label: p.title, kind: "product" }));
    data.categories.forEach((c) => rows.push({ key: `c-${c.slug}`, href: `/products?category=${c.slug}`, label: c.name, kind: "category" }));
    data.brands.forEach((b) => rows.push({ key: `b-${b.slug}`, href: `/products?brand=${b.slug}`, label: b.name, kind: "brand" }));
    rows.push({ key: "all", href: `/products?q=${encodeURIComponent(q)}`, label: `See all results for “${q}”`, kind: "all" });
  } else if (q.length < 2) {
    recent.forEach((r) => rows.push({ key: `r-${r}`, href: `/products?q=${encodeURIComponent(r)}`, label: r, kind: "recent" }));
    trend.filter((t) => !recent.includes(t)).forEach((t) => rows.push({ key: `t-${t}`, href: `/products?q=${encodeURIComponent(t)}`, label: t, kind: "trend" }));
  }

  const go = (href: string, term?: string) => {
    const t = (term ?? "").trim();
    if (t.length >= 2) { writeRecent(t); send("POST", "search/log", { q: t }).catch(() => {}); }
    setOpen(false);
    router.push(href);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && rows[active]) {
      const r = rows[active];
      return go(r.href, r.kind === "recent" || r.kind === "trend" ? r.label : r.kind === "all" ? q : undefined);
    }
    if (q) go(`/products?q=${encodeURIComponent(q)}`, q);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % Math.max(rows.length, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? rows.length - 1 : a - 1)); }
    else if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
  };

  const listen = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = document.documentElement.lang || "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = String((e.results as unknown as { 0: { 0: { transcript: string } } })[0][0].transcript).trim();
      setValue(text);
      if (text) go(`/products?q=${encodeURIComponent(text)}`, text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const showPanel = open && (rows.length > 0 || (q.length >= 2 && data));
  return (
    <form ref={box} action="/products" role="search" onSubmit={submit} className="relative">
      <SearchIcon size={16} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={input} name="q" value={value} autoComplete="off" placeholder={list[hintIdx % list.length]} aria-label="Search products"
        role="combobox" aria-expanded={!!showPanel} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
        onChange={(e) => { setValue(e.target.value); setActive(-1); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
        className={`${className} ${canVoice ? "pr-8" : ""}`}
      />
      {canVoice && (
        <button type="button" onClick={listen} aria-label={listening ? "Listening" : "Search by voice"} title="Search by voice"
          className={`absolute right-0 top-1/2 -translate-y-1/2 p-1.5 transition hover:text-accent ${listening ? "animate-pulse text-accent" : "text-muted"}`}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden><path d="M9 4h6v9a3 3 0 0 1-6 0z" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="rgb(var(--accent))" /></svg>
        </button>
      )}
      {showPanel && (
        <div id={`${id}-list`} role="listbox" className={`absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] border border-line bg-card p-2 shadow-2xl ${panelClass}`}>
          {q.length < 2 && recent.length > 0 && (
            <div className="flex items-center justify-between px-2 pb-1 pt-1">
              <p className="eyebrow !text-[0.6rem]">Recent</p>
              <button type="button" className="p-1 text-muted hover:text-accent" aria-label="Clear recent searches" onClick={() => { try { localStorage.removeItem(RECENT); } catch {} setRecent([]); }}><CloseIcon size={12} /></button>
            </div>
          )}
          {rows.map((r, i) => {
            const p = r.kind === "product" ? data?.products.find((x) => `p-${x.slug}` === r.key) : undefined;
            const showTrendHead = r.kind === "trend" && rows[i - 1]?.kind !== "trend";
            return (
              <div key={r.key}>
                {showTrendHead && <p className="eyebrow !text-[0.6rem] px-2 pb-1 pt-3">Trending</p>}
                {r.kind === "category" && rows[i - 1]?.kind === "product" && <p className="eyebrow !text-[0.6rem] px-2 pb-1 pt-3">Categories & brands</p>}
                <Link
                  id={`${id}-${i}`} role="option" aria-selected={active === i} href={r.href}
                  onClick={(e) => { e.preventDefault(); go(r.href, r.kind === "recent" || r.kind === "trend" ? r.label : r.kind === "all" ? q : undefined); }}
                  className={`flex items-center gap-3 px-2 py-2 text-sm transition ${active === i ? "bg-line/60 text-accent" : "hover:bg-line/40"} ${r.kind === "all" ? "mt-1 border-t border-line pt-3 text-xs font-semibold uppercase tracking-widest" : ""}`}
                >
                  {p ? (
                    <>
                      {p.image ? <img src={p.image} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-cover" /> : <span className="h-10 w-10 shrink-0 bg-line" />}
                      <span className="min-w-0 flex-1"><span className="line-clamp-1">{p.title}</span><span className="text-xs text-muted">{pkr(p.selling_price)}{p.discount_pct ? ` · -${p.discount_pct}%` : ""}{p.stock_quantity === 0 ? " · Sold out" : ""}</span></span>
                    </>
                  ) : (
                    <>
                      {(r.kind === "recent" || r.kind === "trend") && <SearchIcon size={14} className="shrink-0 text-muted" />}
                      <span className="min-w-0 flex-1 truncate">{r.label}</span>
                      {r.kind === "category" && <span className="text-[0.6rem] uppercase tracking-widest text-muted">Category</span>}
                      {r.kind === "brand" && <span className="text-[0.6rem] uppercase tracking-widest text-muted">Brand</span>}
                    </>
                  )}
                </Link>
              </div>
            );
          })}
          {q.length >= 2 && data && data.products.length + data.categories.length + data.brands.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted">No matches for “{q}”. Try a shorter word.</p>
          )}
        </div>
      )}
    </form>
  );
}
