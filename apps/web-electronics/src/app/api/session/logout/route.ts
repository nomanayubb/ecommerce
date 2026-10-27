import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AT, RT } from "@/lib/session";

export async function POST() {
  const jar = await cookies();
  jar.delete(AT);
  jar.delete(RT);
  return NextResponse.json({ ok: true });
}
