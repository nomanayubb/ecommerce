import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** One sitemap that lists every shop's own sitemap. The list comes from stores.json (the file the deploy kit installs on the server, which holds exactly the shops that run there),
 *  so a new shop appears here by itself and never has to be submitted to Google separately. Submit /sitemap-all.xml once in Search Console. */
export function GET() {
  let domain = "";
  let subs: string[] = [];
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "..", "..", "stores.json"), "utf8")) as { domain?: string; stores?: { subdomain?: string }[] };
    domain = (reg.domain ?? "").trim();
    subs = (reg.stores ?? []).map((s) => (s.subdomain ?? "").trim()).filter(Boolean);
  } catch { /* no registry (local dev): list only this shop */ }
  const urls = [`${SITE}/sitemap.xml`, ...(domain ? subs.map((s) => `https://${s}.${domain}/sitemap.xml`) : [])];
  const now = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<sitemap><loc>${u}</loc><lastmod>${now}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" } });
}
