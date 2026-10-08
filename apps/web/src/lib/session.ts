import { cookies } from "next/headers";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
export const AT = "ax_at"; // access token (15 min), httpOnly
export const RT = "ax_rt"; // refresh token (30 days), httpOnly
const isProd = process.env.NODE_ENV === "production";

export const cookieOpts = (maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, secure: isProd, path: "/", maxAge });
export const AT_AGE = 15 * 60;
export const RT_AGE = 30 * 24 * 60 * 60;

/** Server-side call to the API with the signed-in customer's token (if any). Never cached. */
export async function apiAuthed(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get(AT)?.value;
  return fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
}

export interface SessionUser { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null; role: string; wholesaleStatus: string }
export interface Loyalty { points: number; tier: string; nextTier: string | null; pointsToNext: number; pointUnit: number; tiers: { name: string; min: number }[] }

export async function getAccount(): Promise<{ user: SessionUser; loyalty: Loyalty } | null> {
  const r = await apiAuthed("/account/me").catch(() => null);
  return r && r.ok ? r.json() : null;
}
