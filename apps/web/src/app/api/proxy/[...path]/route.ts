import { NextResponse, type NextRequest } from "next/server";
import { apiAuthed } from "@/lib/session";

// Browser -> Next -> API, attaching the httpOnly token. Only these calls are allowed through.
const ALLOW: [string, RegExp][] = [
  ["GET", /^search\/(suggest|trending)$/],
  ["POST", /^search\/log$/],
  ["GET", /^products$/],
  ["GET", /^products\/(?!recommend$)[a-z0-9-]+$/],
  ["GET", /^recipes(\/[a-z0-9-]+)?$/],
  ["GET", /^kitchen\/recipes$/],
  ["POST", /^contact$/],
  ["POST", /^presence\/ping$/],
  ["GET", /^products\/[a-z0-9-]+\/qa$/],
  ["POST", /^products\/[a-z0-9-]+\/qa$/],
  ["GET", /^products\/recommend$/],
  ["POST", /^cart\/validate$/],
  ["POST", /^checkout\/process$/],
  ["POST", /^newsletter$/],
  ["POST", /^products\/[a-z0-9-]+\/(reviews|stock-alert)$/],
  ["POST", /^reviews\/[0-9a-f-]{36}\/helpful$/],
  ["GET", /^account\/(me|addresses|orders)$/],
  ["PUT", /^account\/me$/],
  ["POST", /^account\/addresses$/],
  ["PUT", /^account\/addresses\/[0-9a-f-]{36}$/],
  ["DELETE", /^account\/addresses\/[0-9a-f-]{36}$/],
];

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const path = (await ctx.params).path.join("/");
  if (!ALLOW.some(([m, re]) => m === req.method && re.test(path))) return NextResponse.json({ error: "Not allowed" }, { status: 404 });
  const hasBody = req.method !== "GET" && req.method !== "DELETE";
  const r = await apiAuthed(`/${path}${req.nextUrl.search}`, { method: req.method, body: hasBody ? await req.text() : undefined });
  const text = await r.text();
  return new NextResponse(text || "{}", { status: r.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
