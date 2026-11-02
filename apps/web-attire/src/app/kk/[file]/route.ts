import fs from "node:fs";
import path from "node:path";

// Imported product photos live in public/kk. The Next server only notices files that existed when it started,
// so photos added later (while an import is running) are served from here instead of returning 404.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-z0-9._-]+\.webp$/i.test(file)) return new Response("Not found", { status: 404 });
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", "kk", file));
    return new Response(new Uint8Array(buf), { headers: { "content-type": "image/webp", "cache-control": "public, max-age=86400, stale-while-revalidate=604800" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
