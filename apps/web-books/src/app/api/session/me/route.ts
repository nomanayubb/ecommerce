import { NextResponse } from "next/server";
import { getAccount } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await getAccount();
  return NextResponse.json({ user: a?.user ?? null, loyalty: a?.loyalty ?? null }, { headers: { "cache-control": "no-store" } });
}
