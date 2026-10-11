"use client";

import { useState } from "react";

/** Share through the phone's own share sheet; on desktop copy the link (WhatsApp shortcut shown too). */
export function ShareButton({ title, text, className = "" }: { title: string; text?: string; className?: string }) {
  const [msg, setMsg] = useState("");
  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(url);
      setMsg("Link copied");
    } catch { setMsg(""); return; }
    setTimeout(() => setMsg(""), 2200);
  };
  return (
    <span className="inline-flex items-center gap-3">
      <button type="button" onClick={share} className={`text-xs font-semibold uppercase tracking-[0.2em] text-muted transition hover:text-accent ${className}`}>Share</button>
      {msg && <span role="status" className="text-xs text-accent">{msg}</span>}
    </span>
  );
}
