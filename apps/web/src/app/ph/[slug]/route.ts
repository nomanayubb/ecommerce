// On-brand placeholder artwork until real product photography is uploaded. /ph/<slug>?ar=4x3|4x5&v=2
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const wide = url.searchParams.get("ar") === "4x3";
  const [w, h] = wide ? [800, 600] : [800, 1000];
  const title = esc(slug.replace(/[^a-z0-9]+/gi, " ").trim().toUpperCase().slice(0, 40));
  const shift = url.searchParams.get("v") === "2" ? 80 : 0;
  const cx = w / 2, cy = h * 0.42;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1a1e"/><stop offset="1" stop-color="#0c0c0e"/></linearGradient>
<radialGradient id="r" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#d4aa46" stop-opacity=".18"/><stop offset="1" stop-color="#d4aa46" stop-opacity="0"/></radialGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#r)"/>
<g fill="none" stroke="#d4aa46" stroke-width="2" stroke-linecap="square" transform="translate(${shift ? 30 : 0} 0)">
<path d="M${cx - 150} ${cy + 130} L${cx} ${cy - 130} L${cx + 40} ${cy - 130}" opacity=".9"/>
<path d="M${cx - 80} ${cy + 130} L${cx + 30} ${cy - 40}" opacity=".5"/>
<path d="M${cx - 20} ${cy + 20} L${cx + 140} ${cy + 20} L${cx + 170} ${cy - 60} L${cx + 200} ${cy - 60}"/>
<path d="M${cx} ${cy + 20} L${cx + 15} ${cy + 80} L${cx + 130} ${cy + 80} L${cx + 150} ${cy + 20}" opacity=".8"/>
<circle cx="${cx + 35}" cy="${cy + 108}" r="11" opacity=".9"/><circle cx="${cx + 110}" cy="${cy + 108}" r="11" opacity=".9"/></g>
<rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="#d4aa46" stroke-opacity=".25"/>
<text x="${cx}" y="${h - 70}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="22" letter-spacing="7" fill="#f5f0e6" fill-opacity=".75">${title}</text>
<text x="${cx}" y="${h - 42}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" letter-spacing="6" fill="#d4aa46">AVERIXA</text></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400, immutable" } });
}
