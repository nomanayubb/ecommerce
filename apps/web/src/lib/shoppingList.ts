"use client";

import { useEffect, useState } from "react";

/** A shopping list kept in this browser (localStorage). Recipes and the meal planner add to it; the shopper ticks items off. */
export interface ListItem { key: string; name: string; qty: number | null; unit: string; done: boolean; productSlug: string | null; from: string[] }
const KEY = "shopping-list";

export const readList = (): ListItem[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
const write = (items: ListItem[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  window.dispatchEvent(new Event("shopping-list"));
};

const keyOf = (name: string, unit: string) => `${name.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;

/** Adds lines, summing quantities when the same ingredient (and unit) is already on the list. */
export function addToList(lines: { name: string; qty: number | null; unit: string; productSlug: string | null }[], from: string) {
  const items = readList();
  for (const l of lines) {
    const k = keyOf(l.name, l.unit);
    const hit = items.find((i) => i.key === k);
    if (hit) {
      hit.qty = hit.qty != null && l.qty != null ? Math.round((hit.qty + l.qty) * 100) / 100 : hit.qty ?? l.qty;
      hit.done = false;
      if (!hit.from.includes(from)) hit.from.push(from);
      hit.productSlug = hit.productSlug ?? l.productSlug;
    } else items.push({ key: k, name: l.name, qty: l.qty, unit: l.unit, done: false, productSlug: l.productSlug, from: [from] });
  }
  write(items);
}
export const toggleItem = (key: string) => write(readList().map((i) => (i.key === key ? { ...i, done: !i.done } : i)));
export const removeItem = (key: string) => write(readList().filter((i) => i.key !== key));
export const clearList = (onlyDone = false) => write(onlyDone ? readList().filter((i) => !i.done) : []);

export function useShoppingList(): ListItem[] {
  const [items, setItems] = useState<ListItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(readList());
    sync();
    window.addEventListener("shopping-list", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("shopping-list", sync); window.removeEventListener("storage", sync); };
  }, []);
  return items;
}
