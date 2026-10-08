"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface PublicUser { id: string; email: string; firstName: string | null; lastName: string | null; role: string }
interface Ctx { user: PublicUser | null; ready: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> }
const C = createContext<Ctx>({ user: null, ready: false, refresh: async () => {}, signOut: async () => {} });
export const useSession = () => useContext(C);

/** Knows who is signed in without making pages dynamic: asks `/api/session/me` once on load. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const d = await fetch("/api/session/me", { cache: "no-store" }).then((r) => r.json());
      setUser(d.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/session/logout", { method: "POST" });
    setUser(null);
  }, []);

  return <C.Provider value={{ user, ready, refresh, signOut }}>{children}</C.Provider>;
}
