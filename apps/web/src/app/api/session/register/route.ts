import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API, AT, AT_AGE, RT, RT_AGE, cookieOpts } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const r = await fetch(`${API}/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json({ error: d.issues?.[0]?.message ?? d.error ?? "Could not create account" }, { status: r.status });
  const jar = await cookies();
  jar.set(AT, d.accessToken, cookieOpts(AT_AGE));
  jar.set(RT, d.refreshToken, cookieOpts(RT_AGE));
  return NextResponse.json({ user: d.user }, { status: 201 });
}
