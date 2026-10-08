"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getToken, setToken } from "@/lib/api";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/orders", label: "Orders" },
  { href: "/settings", label: "Brand & theme" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (path === "/login") return setReady(true);
    if (!getToken()) router.replace("/login");
    else setReady(true);
  }, [path, router]);

  if (path === "/login") return <>{children}</>;
  if (!ready) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="w-52 shrink-0 border-r border-line bg-card p-4">
        <div className="mb-6 flex items-center gap-2"><img src="/logo-mark.webp" alt="" className="h-8 w-auto" /><span className="font-semibold uppercase tracking-[0.2em]">Admin</span></div>
        <nav className="space-y-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`block rounded px-3 py-2 ${(n.href === "/" ? path === "/" : path.startsWith(n.href)) ? "bg-brand/15 font-medium text-brand" : "hover:bg-line/50"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          className="mt-8 text-sm text-muted"
          onClick={() => { setToken(null); router.replace("/login"); }}
        >
          Sign out
        </button>
      </aside>
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}
