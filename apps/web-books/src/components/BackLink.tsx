"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** "Back to results": remembers the last product list the shopper was on. */
export function BackLink() {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => { try { setHref(sessionStorage.getItem("last-list")); } catch {} }, []);
  if (!href) return null;
  return <Link href={href} className="mb-2 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-muted transition hover:text-accent">← Back to results</Link>;
}
export const rememberList = () => { try { sessionStorage.setItem("last-list", location.pathname + location.search); } catch {} };
