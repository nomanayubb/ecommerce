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

interface CartCtx {
  lines: CartLine[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (l: CartLine) => void;
  setQty: (productId: string, variantId: string | null, qty: number) => void;
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setLines(JSON.parse(localStorage.getItem("cart") ?? "[]"));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("cart", JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = (l: CartLine) => {
    setLines((cur) =>
      cur.some((x) => same(x, l.productId, l.variantId))
        ? cur.map((x) => (same(x, l.productId, l.variantId) ? { ...x, quantity: x.quantity + l.quantity } : x))
        : [...cur, l]
    );
    flyToCart(l.image);
    setOpen(true);
  };
  const setQty = (p: string, v: string | null, qty: number) =>
    setLines((cur) => (qty <= 0 ? cur.filter((x) => !same(x, p, v)) : cur.map((x) => (same(x, p, v) ? { ...x, quantity: qty } : x))));

  return (
    <Ctx.Provider
      value={{ lines, open, setOpen, add, setQty, clear: () => setLines([]), count: lines.reduce((s, l) => s + l.quantity, 0) }}
    >
      {children}
    </Ctx.Provider>
  );
}
