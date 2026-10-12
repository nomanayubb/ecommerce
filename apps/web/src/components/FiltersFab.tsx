"use client";

import { useEffect, useState } from "react";

/** Phones: a floating "Filters" button appears once you have scrolled past the filter panel, and jumps back to it. */
export function FiltersFab() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(scrollY > 520);
    addEventListener("scroll", on, { passive: true });
    on();
    return () => removeEventListener("scroll", on);
  }, []);
  if (!show) return null;
  return (
    <button type="button" className="glass fixed bottom-24 right-4 z-40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] lg:hidden"
      onClick={() => { const d = document.getElementById("filters") as HTMLDetailsElement | null; if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); } }}>Filters</button>
  );
}
