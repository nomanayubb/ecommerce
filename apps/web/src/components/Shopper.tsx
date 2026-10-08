"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProductSummary } from "@/lib/api";

/** Light-weight product snapshot kept in localStorage (wishlist, compare, recently viewed). */
export interface Lite { id: string; slug: string; title: string; price: number; marked: number; image?: string; brand?: string | null }

export const toLite = (p: ProductSummary): Lite => ({
  id: p.id, slug: p.slug, title: p.title, price: Number(p.selling_price), marked: Number(p.marked_price), image: p.images?.[0], brand: p.brand_name,
});

const MAX_COMPARE = 4;
const MAX_RECENT = 8;

interface ShopperCtx {
  wish: Lite[]; compare: Lite[]; recent: Lite[]; quick: Lite | null; notice: string;
  inWish: (slug: string) => boolean; toggleWish: (l: Lite) => boolean;
  inCompare: (slug: string) => boolean; toggleCompare: (l: Lite) => void; clearCompare: () => void;
  pushRecent: (l: Lite) => void; openQuick: (l: Lite) => void; closeQuick: () => void;
}
const Ctx = createContext<ShopperCtx | null>(null);
export const useShopper = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useShopper outside ShopperProvider");
  return c;
};

const read = (k: string): Lite[] => {
  try { const v = JSON.parse(localStorage.getItem(k) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
const write = (k: string, v: Lite[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function ShopperProvider({ children }: { children: ReactNode }) {
  const [wish, setWish] = useState<Lite[]>([]);
  const [compare, setCompare] = useState<Lite[]>([]);
  const [recent, setRecent] = useState<Lite[]>([]);
  const [quick, setQuick] = useState<Lite | null>(null);
  const [notice, setNotice] = useState("");
  const ready = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setWish(read("wishlist")); setCompare(read("compare")); setRecent(read("recent"));
    ready.current = true;
  }, []);
  useEffect(() => { if (ready.current) write("wishlist", wish); }, [wish]);
  useEffect(() => { if (ready.current) write("compare", compare); }, [compare]);
  useEffect(() => { if (ready.current) write("recent", recent); }, [recent]);

  const say = (m: string) => { setNotice(m); clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(""), 2800); };

  const toggleWish = useCallback((l: Lite) => {
    const has = wish.some((x) => x.slug === l.slug);
    setWish(has ? wish.filter((x) => x.slug !== l.slug) : [l, ...wish]);
    return !has;
  }, [wish]);

  const toggleCompare = useCallback((l: Lite) => {
    if (compare.some((x) => x.slug === l.slug)) return setCompare(compare.filter((x) => x.slug !== l.slug));
    if (compare.length >= MAX_COMPARE) return say(`You can compare up to ${MAX_COMPARE} products`);
    setCompare([...compare, l]);
  }, [compare]);

  const pushRecent = useCallback((l: Lite) => setRecent((r) => [l, ...r.filter((x) => x.slug !== l.slug)].slice(0, MAX_RECENT)), []);

  const value = useMemo<ShopperCtx>(() => ({
    wish, compare, recent, quick, notice,
    inWish: (s) => wish.some((x) => x.slug === s), toggleWish,
    inCompare: (s) => compare.some((x) => x.slug === s), toggleCompare, clearCompare: () => setCompare([]),
    pushRecent, openQuick: setQuick, closeQuick: () => setQuick(null),
  }), [wish, compare, recent, quick, notice, toggleWish, toggleCompare, pushRecent]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
