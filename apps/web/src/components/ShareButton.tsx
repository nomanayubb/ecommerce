"use client";

import { useEffect, useState } from "react";

/** Share through the phone's own share sheet; on desktop copy the link. A WhatsApp shortcut is always there. */
export function ShareButton({ title, text, className = "" }: { title: string; text?: string; className?: string }) {
  const [msg, setMsg] = useState("");
  const [wa, setWa] = useState("");
  useEffect(() => { setWa(`https://wa.me/?text=${encodeURIComponent(`${title} ${location.href}`)}`); }, [title]);
  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(url);
      setMsg("Link copied");
    } catch { setMsg(""); return; }
    setTimeout(() => setMsg(""), 2200);
  };
  const cls = `text-xs font-semibold uppercase tracking-[0.2em] text-muted transition hover:text-accent ${className}`;
  return (
    <span className="inline-flex items-center gap-4">
      <button type="button" onClick={share} className={cls}>Share</button>
      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={cls}>WhatsApp</a>}
      {msg && <span role="status" className="text-xs text-accent">{msg}</span>}
    </span>
  );
}
