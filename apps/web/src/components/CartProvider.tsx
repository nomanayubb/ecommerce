"use client";

import { flyToCart } from "@/lib/motion";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartLine {
  productId: string;
  variantId: string | null;
  title: string;
  price: number;
  image?: string;
  quantity: number;
}

/** Things the shopper chose that are not products: promo code, order note, gift wrap + message. */
export interface CartExtras { coupon: string; note: string; giftWrap: boolean; giftMessage: string }
const NO_EXTRAS: CartExtras = { coupon: "", note: "", giftWrap: false, giftMessage: "" };

interface CartCtx {
  lines: CartLine[];
  saved: CartLine[];
  extras: CartExtras;
  setExtras: (patch: Partial<CartExtras>) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (l: CartLine) => void;
  setQty: (productId: string, variantId: string | null, qty: number) => void;
  saveForLater: (productId: string, variantId: string | null) => void;
  moveToBag: (productId: string, variantId: string | null) => void;
  removeSaved: (productId: string, variantId: string | null) => void;
  clear: () => void;
  count: number;
}

const Ctx = createContext<CartCtx | null>(null);
export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};

const same = (a: CartLine, p: string, v: string | null) => a.productId === p && a.variantId === v;
const merge = (cur: CartLine[], l: CartLine) =>
  cur.some((x) => same(x, l.productId, l.variantId))
    ? cur.map((x) => (same(x, l.productId, l.variantId) ? { ...x, quantity: x.quantity + l.quantity } : x))
    : [...cur, l];

const read = <T,>(k: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "") as T; } catch { return fallback; } };

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [saved, setSaved] = useState<CartLine[]>([]);
  const [extras, setExtrasState] = useState<CartExtras>(NO_EXTRAS);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(read("cart", []));
    setSaved(read("cart-saved", []));
    setExtrasState({ ...NO_EXTRAS, ...read("cart-extras", {}) });
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("cart", JSON.stringify(lines));
      localStorage.setItem("cart-saved", JSON.stringify(saved));
      localStorage.setItem("cart-extras", JSON.stringify(extras));
    } catch {}
  }, [lines, saved, extras, ready]);

  const add = (l: CartLine) => {
    setLines((cur) => merge(cur, l));
    // Adding something you saved for later counts as moving it.
    setSaved((cur) => cur.filter((x) => !same(x, l.productId, l.variantId)));
    flyToCart(l.image);
    setOpen(true);
  };
  const setQty = (p: string, v: string | null, qty: number) =>
    setLines((cur) => (qty <= 0 ? cur.filter((x) => !same(x, p, v)) : cur.map((x) => (same(x, p, v) ? { ...x, quantity: qty } : x))));
  const saveForLater = (p: string, v: string | null) => {
    const line = lines.find((x) => same(x, p, v));
    if (!line) return;
    setLines((cur) => cur.filter((x) => !same(x, p, v)));
    setSaved((cur) => merge(cur, line));
  };
  const moveToBag = (p: string, v: string | null) => {
    const line = saved.find((x) => same(x, p, v));
    if (!line) return;
    setSaved((cur) => cur.filter((x) => !same(x, p, v)));
    setLines((cur) => merge(cur, line));
  };
  const removeSaved = (p: string, v: string | null) => setSaved((cur) => cur.filter((x) => !same(x, p, v)));
  const setExtras = (patch: Partial<CartExtras>) => setExtrasState((cur) => ({ ...cur, ...patch }));

  return (
    <Ctx.Provider
      value={{
        lines, saved, extras, setExtras, open, setOpen, add, setQty, saveForLater, moveToBag, removeSaved,
        clear: () => { setLines([]); setExtrasState(NO_EXTRAS); },
        count: lines.reduce((s, l) => s + l.quantity, 0),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
