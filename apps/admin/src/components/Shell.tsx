"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { chooseStore, getScope, getStore, getStores, getToken, setScope, setStores, setToken, type StoreInfo } from "@/lib/api";
import { BrandLogo, useBrand } from "@/lib/brand";

const NAV: { heading?: string; items: { href: string; label: string }[] }[] = [
  { items: [{ href: "/", label: "Home" }, { href: "/orders", label: "Orders" }] },
  { heading: "Products", items: [{ href: "/products", label: "Products" }, { href: "/collections", label: "Collections" }, { href: "/coupons", label: "Discounts" }, { href: "/bundles", label: "Bundles" }] },
  { heading: "Customers", items: [{ href: "/reviews", label: "Reviews" }, { href: "/questions", label: "Questions" }, { href: "/messages", label: "Messages" }] },
  { heading: "Online store", items: [{ href: "/pages", label: "Pages" }, { href: "/navigation", label: "Navigation" }, { href: "/posts", label: "Blog posts" }, { href: "/recipes", label: "Recipes" }, { href: "/settings", label: "Brand & settings" }] },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const brand = useBrand();
  const [stores, setList] = useState<StoreInfo[]>([]);
  const [store, setStore] = useState("");
  const [scope, setScopeState] = useState<"this" | "all">("this");

  // The shops this admin can manage (public/stores.json); the chosen one decides which shop's data every page shows.
  useEffect(() => {
    setList(getStores()); setStore(getStore()?.slug ?? getStores()[0]?.slug ?? ""); setScopeState(getScope());
    fetch("/stores.json", { cache: "no-store" }).then((r) => r.json()).then((l: StoreInfo[]) => {
      if (!Array.isArray(l) || !l.length) return;
      setStores(l); setList(l);
      const cur = getStore()?.slug ?? l[0].slug; chooseStore(cur); setStore(cur);
      if (!getStore() || getStore()!.api !== l.find((x) => x.slug === cur)!.api) window.location.reload();
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (path === "/login") return setReady(true);
    if (!getToken()) router.replace("/login");
    else setReady(true);
  }, [path, router]);

  if (path === "/login") return <>{children}</>;
  if (!ready) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-line bg-card p-4">
        <div className="mb-6"><BrandLogo brand={brand} className="h-7" /><p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-accent">Admin</p>
          {stores.length > 1 && (
            <label className="mt-3 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">Store
              <select value={store} onChange={(e) => { chooseStore(e.target.value); window.location.href = "/"; }} className="mt-1 w-full rounded border border-line bg-card px-2 py-1.5 text-sm normal-case tracking-normal text-fg">
                {stores.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
            </label>
          )}
          {stores.length > 1 && (
            <label className="mt-3 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">Settings changes apply to
              <select value={scope} onChange={(e) => { const v = e.target.value === "all" ? "all" : "this"; setScope(v); setScopeState(v); }} className={`mt-1 w-full rounded border bg-card px-2 py-1.5 text-sm normal-case tracking-normal ${scope === "all" ? "border-accent text-accent" : "border-line text-fg"}`}>
                <option value="this">This store only</option>
                <option value="all">All stores</option>
              </select>
            </label>
          )}
        </div>
        <nav className="space-y-5 text-sm">
          {NAV.map((g, gi) => (
            <div key={gi} className="space-y-1">
              {g.heading && <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">{g.heading}</p>}
              {g.items.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`block rounded px-3 py-2 ${(n.href === "/" ? path === "/" : path.startsWith(n.href)) ? "bg-brand/15 font-medium text-brand" : "hover:bg-line/50"}`}
                >
                  {n.label}
                </Link>
              ))}
            </div>
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
