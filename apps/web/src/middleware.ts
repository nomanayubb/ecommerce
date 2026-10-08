import { NextResponse, type NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Silently renews the 15-minute access token from the refresh cookie so signed-in pages keep working. */
export async function middleware(req: NextRequest) {
  const at = req.cookies.get("ax_at")?.value;
  const rt = req.cookies.get("ax_rt")?.value;
  const protectedPath = req.nextUrl.pathname.startsWith("/account");
  const toLogin = () => NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
  if (at) return NextResponse.next();
  if (!rt) return protectedPath ? toLogin() : NextResponse.next();

  try {
    const r = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: rt }) });
    if (r.ok) {
      const d = await r.json();
      // make the new token visible to this very request, and persist it for the browser
      const headers = new Headers(req.headers);
      const jar = (headers.get("cookie") ?? "").split("; ").filter((c) => c && !c.startsWith("ax_at=")).concat(`ax_at=${d.accessToken}`).join("; ");
      headers.set("cookie", jar);
      const res = NextResponse.next({ request: { headers } });
      const base = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
      res.cookies.set("ax_at", d.accessToken, { ...base, maxAge: 15 * 60 });
      if (d.refreshToken) res.cookies.set("ax_rt", d.refreshToken, { ...base, maxAge: 30 * 24 * 60 * 60 });
      return res;
    }
  } catch {
    // API down: carry on as a guest
  }
  const res = protectedPath ? toLogin() : NextResponse.next();
  res.cookies.delete("ax_rt"); // refresh token rejected: end the session
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|ph/|icon-|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"] };
