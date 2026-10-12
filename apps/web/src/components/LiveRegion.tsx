"use client";

import { useEffect, useState } from "react";

/** Screen-reader announcements ("Added to bag") without anything appearing on screen. */
export function LiveRegion() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const on = (e: Event) => { setMsg(""); const t = String((e as CustomEvent).detail ?? ""); setTimeout(() => setMsg(t), 50); };
    addEventListener("announce", on);
    return () => removeEventListener("announce", on);
  }, []);
  return <div aria-live="polite" role="status" className="sr-only">{msg}</div>;
}
