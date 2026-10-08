"use client";

import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
export interface AdminBrand { name: string; logoUrl: string; logoUrlDark: string }
const FALLBACK: AdminBrand = { name: "Admin", logoUrl: "", logoUrlDark: "" };

/** Brand name + logos from public settings, so the admin follows whichever brand the store uses. */
export function useBrand(): AdminBrand {
  const [b, setB] = useState<AdminBrand>(FALLBACK);
  useEffect(() => {
    fetch(`${BASE}/settings`).then((r) => r.json()).then((d) => d.branding && setB({ name: d.branding.name, logoUrl: d.branding.logoUrl ?? "", logoUrlDark: d.branding.logoUrlDark ?? "" })).catch(() => {});
  }, []);
  return b;
}

export function BrandLogo({ brand, className = "h-8" }: { brand: AdminBrand; className?: string }) {
  if (!brand.logoUrl) return <span className="text-sm font-semibold uppercase tracking-[0.3em]">{brand.name}</span>;
  return (
    <>
      <img src={brand.logoUrl} alt={brand.name} className={`logo-on-light w-auto ${className}`} />
      <img src={brand.logoUrlDark || brand.logoUrl} alt={brand.name} className={`logo-on-dark w-auto ${className}`} />
    </>
  );
}
