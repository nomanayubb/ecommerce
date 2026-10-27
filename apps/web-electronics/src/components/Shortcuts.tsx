"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";

const typing = (t: EventTarget | null) => { const e = t as HTMLElement | null; return !!e && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) || e.isContentEditable); };

/** Keyboard shortcuts for fast shoppers: / search, b bag, w wishlist, h home, ? help. Ignored while typing. */
export function Shortcuts() {
  const router = useRouter();
  const { setOpen } = useCart();
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) { if (e.key === "Escape") setHelp(false); return; }
      if (e.key === "/") { const i = [...document.querySelectorAll<HTMLInputElement>('input[name="q"]')].find((x) => x.offsetParent); if (i) { e.preventDefault(); i.focus(); } }
      else if (e.key === "b") setOpen(true);
      else if (e.key === "w") router.push("/wishlist");
      else if (e.key === "h") router.push("/");
      else if (e.key === "?") setHelp((v) => !v);
      else if (e.key === "Escape") setHelp(false);
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, [router, setOpen]);
  if (!help) return null;
  return (
    <div role="dialog" aria-label="Keyboard shortcuts" className="fixed bottom-6 left-1/2 z-[80] w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 border border-line bg-card p-5 shadow-2xl">
      <p className="eyebrow !text-[0.65rem]">Keyboard shortcuts</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {[["/", "Search"], ["b", "Open the bag"], ["w", "Wishlist"], ["h", "Home"], ["?", "This help"], ["Esc", "Close"]].map(([k, t]) => <div key={k} className="contents"><dt><kbd className="border border-line px-2 py-0.5 text-xs">{k}</kbd></dt><dd className="text-muted">{t}</dd></div>)}
      </dl>
    </div>
  );
}
