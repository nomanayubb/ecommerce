// Pictures uploaded in the admin live in the database; this serves them from the shop's own address.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const res = await fetch(`${BASE}/uploads/${encodeURIComponent(name)}`, { next: { revalidate: 3600 } });
  if (!res.ok) return new Response("Not found", { status: 404 });
  return new Response(await res.arrayBuffer(), { headers: { "content-type": res.headers.get("content-type") ?? "image/webp", "cache-control": "public, max-age=86400, s-maxage=604800" } });
}
