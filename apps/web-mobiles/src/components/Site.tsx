"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_BRANDING, DEFAULT_STORE, type Branding, type Store } from "@/lib/api";

interface Site { branding: Branding; store: Store }
const Ctx = createContext<Site>({ branding: DEFAULT_BRANDING, store: DEFAULT_STORE });

/** Makes brand settings + store rules available to client components (cart drawer, buy panel). */
export function SiteProvider({ value, children }: { value: Site; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useSite = () => useContext(Ctx);
