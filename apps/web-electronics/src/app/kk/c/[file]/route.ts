import fs from "node:fs";
import path from "node:path";

// Transparent cut-outs of the imported product photos (public/kk/c). Read from disk so new files work without a restart.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-z0-9._-]+\.webp$/i.test(file)) return new Response("Not found", { status: 404 });
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", "kk", "c", file));
    return new Response(new Uint8Array(buf), { headers: { "content-type": "image/webp", "cache-control": "public, max-age=86400, stale-while-revalidate=604800" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
