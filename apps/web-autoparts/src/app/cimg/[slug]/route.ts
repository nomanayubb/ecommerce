import { api, getSite, type CategoryNode } from "@/lib/api";

// Collection artwork: /cimg/<slug>?ar=4x3|cover. Brand colours come from the brand settings (the animated logo is laid over it by the page), the line drawing
// follows the top-level menu the collection belongs to, and the composition varies a little per collection so a grid of
// them looks like one family without being identical. No text in the picture (the page writes the name).
const ok = (h: unknown, d: string) => (typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h) ? h : d);
const mix = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return "#" + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("");
};
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Line drawings on a 200 x 200 grid, centred on 100,100. */
const ICONS: Record<string, string> = {
  grocery: '<path d="M60 80 Q100 20 140 80"/><path d="M30 80 H170 L155 165 H45 Z"/><path d="M70 80 V165 M100 80 V165 M130 80 V165"/>',
  cosmetics: '<path d="M80 170 V112 H120 V170 Z"/><path d="M80 134 H120"/><path d="M88 112 V76 L112 56 V112"/>',
  household: '<path d="M45 92 H155 V150 Q155 165 140 165 H60 Q45 165 45 150 Z"/><path d="M50 92 Q100 44 150 92"/><path d="M94 56 H106"/><path d="M45 108 H25 V124 H45 M155 108 H175 V124 H155"/>',
  crockery: '<path d="M50 80 H140 V120 Q140 160 95 160 Q50 160 50 120 Z"/><path d="M140 90 H158 Q172 90 172 108 Q172 126 150 126 H140"/><path d="M35 174 H155"/><path d="M80 62 Q72 52 80 42 M105 62 Q97 52 105 42"/>',
  baby: '<path d="M88 56 Q100 20 112 56"/><path d="M80 56 H120 V72 H80 Z"/><path d="M75 72 V160 Q75 172 87 172 H113 Q125 172 125 160 V72"/><path d="M75 100 H95 M75 124 H95 M75 148 H95"/>',
  toys: '<path d="M38 122 H98 V172 H38 Z M102 122 H162 V172 H102 Z M70 72 H130 V118 H70 Z"/><circle cx="100" cy="95" r="13"/><path d="M62 147 H74 M126 147 H138"/>',
  sports: '<circle cx="100" cy="100" r="66"/><path d="M34 100 Q100 62 166 100 M34 100 Q100 138 166 100 M100 34 Q132 100 100 166 M100 34 Q68 100 100 166"/>',
  fragrances: '<path d="M55 96 H145 V168 H55 Z"/><path d="M85 96 V76 H115 V96"/><path d="M80 76 V50 H120 V76"/><path d="M100 118 l7 13 l13 7 l-13 7 l-7 13 l-7 -13 l-13 -7 l13 -7 z"/>',
  textile: '<path d="M40 66 H160 V98 H40 Z M40 98 H160 V130 H40 Z M40 130 H160 V162 H40 Z"/><path d="M60 82 H140 M60 114 H140 M60 146 H140" stroke-dasharray="6 6"/>',
  gadgets: '<path d="M45 122 V100 A55 55 0 0 1 155 100 V122"/><path d="M35 116 H56 V166 H35 Z M144 116 H165 V166 H144 Z"/>',
  electronics: '<path d="M70 82 H130 V122 Q130 148 100 148 Q70 148 70 122 Z"/><path d="M85 82 V46 M115 82 V46"/><path d="M100 148 V176"/>',
  decor: '<path d="M80 102 Q58 132 80 166 H120 Q142 132 120 102 Z"/><path d="M90 102 V86 H110 V102"/><path d="M100 86 V42 M100 72 Q74 62 70 42 M100 64 Q126 54 130 36"/><circle cx="100" cy="34" r="8"/><circle cx="70" cy="36" r="7"/><circle cx="130" cy="30" r="7"/>',
  pharmacy: '<circle cx="100" cy="100" r="66"/><path d="M100 64 V136 M64 100 H136"/>',
  apparel: '<path d="M65 46 L34 72 L56 96 L70 86 V166 H130 V86 L144 96 L166 72 L135 46 Q100 72 65 46 Z"/>',
  stationery: '<path d="M132 38 L162 68 L76 154 L40 164 L50 128 Z"/><path d="M116 54 L146 84"/>',
  luggage: '<path d="M40 72 H160 V162 H40 Z"/><path d="M80 72 V50 H120 V72"/><path d="M70 72 V162 M130 72 V162"/>',
  watches: '<circle cx="100" cy="100" r="40"/><path d="M80 62 L86 30 H114 L120 62 M80 138 L86 170 H114 L120 138"/><path d="M100 100 V78 M100 100 L118 110"/>',
  jewellery: '<circle cx="100" cy="124" r="44"/><path d="M80 74 L90 52 H110 L120 74 L100 94 Z"/><path d="M80 74 H120"/>',
  bag: '<path d="M40 88 H160 L150 168 H50 Z"/><path d="M70 88 Q70 36 100 36 Q130 36 130 88"/><path d="M92 108 H108 V122 H92 Z"/>',
  footwear: '<path d="M30 142 V96 Q60 102 76 82 L96 102 Q122 116 162 122 Q176 126 176 142 V152 H30 Z"/><path d="M30 152 V164 H176 V152"/><path d="M80 96 L90 106 M92 108 L102 118"/>',
  hanger: '<path d="M100 78 Q100 40 120 42 Q134 44 132 58 Q130 68 100 78"/><path d="M100 78 L168 134 Q174 142 164 142 H36 Q26 142 32 134 Z"/>',
  kitchen: '<path d="M60 90 H140 V150 Q140 164 126 164 H74 Q60 164 60 150 Z"/><path d="M52 90 Q100 40 148 90"/><path d="M60 110 H40 V126 H60 M140 110 H160 V126 H140"/>',
  default: '<path d="M100 34 L166 100 L100 166 L34 100 Z"/><path d="M100 66 L134 100 L100 134 L66 100 Z"/>',
  // Drawings for the home slideshow banners (/cimg/slide-x?ar=cover&f=truck)
  truck: '<path d="M20 70H120V140H20Z"/><path d="M120 95H160L182 120V140H120Z"/><circle cx="55" cy="148" r="14"/><circle cx="150" cy="148" r="14"/><path d="M40 90H100"/>',
  price: '<path d="M30 105L105 30H170V95L95 170Z"/><circle cx="138" cy="62" r="9"/><path d="M82 118L118 82"/>',
  shield: '<path d="M100 28L168 52V104C168 142 140 166 100 176C60 166 32 142 32 104V52Z"/><path d="M70 100L92 122L132 78"/>',
  package: '<path d="M30 70L100 32L170 70V140L100 178L30 140Z"/><path d="M30 70L100 108L170 70M100 108V178"/>',
  sparkle: '<path d="M100 20C106 70 130 94 180 100C130 106 106 130 100 180C94 130 70 106 20 100C70 94 94 70 100 20Z"/><path d="M158 34C160 48 166 54 180 56C166 58 160 64 158 78C156 64 150 58 136 56C150 54 156 48 158 34Z"/>',
};
const FAMILY: [RegExp, string][] = [
  [/grocery/, "grocery"], [/cosmetic/, "cosmetics"], [/household/, "household"], [/crockery/, "crockery"], [/baby/, "baby"], [/toy/, "toys"], [/sport/, "sports"],
  [/fragrance/, "fragrances"], [/textile/, "textile"], [/gadget/, "gadgets"], [/electronic/, "electronics"], [/decoration|decor/, "decor"], [/pharmacy/, "pharmacy"],
  [/men-essential|fashion/, "apparel"], [/stationery/, "stationery"], [/luggage/, "luggage"], [/watch/, "watches"], [/jewel/, "jewellery"], [/ladies-bag/, "bag"],
  [/footwear/, "footwear"], [/home-(and-)?kitchen|kitchen/, "kitchen"],
];

const topOf = (nodes: CategoryNode[], slug: string): string | null => {
  for (const top of nodes) {
    const has = (n: CategoryNode): boolean => n.slug === slug || n.children.some(has);
    if (has(top)) return top.slug;
  }
  return null;
};

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ branding }, tree] = await Promise.all([getSite(), api<CategoryNode[]>("/categories/tree", { revalidate: 300 }).catch(() => [] as CategoryNode[])]);
  const dark = ok(branding.darkColor, "#0f0f11");
  const gold = ok(branding.brandColorDark, "#d4aa46");
  const cream = ok(branding.creamColor, "#faf6ee");
  const cover = new URL(req.url).searchParams.get("ar") === "cover";
  const [w, h] = cover ? [1600, 640] : [800, 600];
  const top = topOf(tree, slug) ?? slug;
  const pick = new URL(req.url).searchParams.get("f") ?? "";
  const family = ICONS[pick] ? pick : FAMILY.find(([re]) => re.test(top))?.[1] ?? "default";
  const hs = hash(slug);
  const tilt = ((hs % 13) - 6);
  const gx = 0.3 + ((hs >> 4) % 40) / 100, gy = 0.25 + ((hs >> 9) % 35) / 100;
  const ring = 180 + ((hs >> 14) % 120);
  const ix = cover ? w * 0.76 : w * 0.64, iy = h * 0.5, k = cover ? 2.3 : 1.9;
  const lines = Array.from({ length: 9 }, (_, n) => `<path d="M${-200 + n * (w / 6)} ${h} L${200 + n * (w / 6)} 0"/>`).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(dark, cream, 0.09)}"/><stop offset=".55" stop-color="${dark}"/><stop offset="1" stop-color="${mix(dark, "#000000", 0.35)}"/></linearGradient>
<radialGradient id="r" cx="${gx}" cy="${gy}" r=".62"><stop offset="0" stop-color="${gold}" stop-opacity=".24"/><stop offset="1" stop-color="${gold}" stop-opacity="0"/></radialGradient>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${gold}"/><stop offset="1" stop-color="${mix(gold, cream, 0.45)}"/></linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#r)"/>
<g stroke="${gold}" stroke-opacity=".07" stroke-width="1">${lines}</g>
<g fill="none" stroke="${gold}" stroke-opacity=".2" stroke-width="1.5"><circle cx="${ix}" cy="${iy}" r="${ring}"/><circle cx="${ix}" cy="${iy}" r="${ring + 70}" stroke-opacity=".1"/></g>
<g fill="none" stroke="url(#s)" stroke-width="${(2.2 / k).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${ix} ${iy}) rotate(${tilt}) scale(${k}) translate(-100 -100)" opacity=".92">${ICONS[family]}</g>
<rect x="22" y="22" width="${w - 44}" height="${h - 44}" fill="none" stroke="${gold}" stroke-opacity=".28"/>
<g stroke="${gold}" stroke-opacity=".7" stroke-width="2"><path d="M22 52 V22 H52"/><path d="M${w - 52} ${h - 22} H${w - 22} V${h - 52}"/></g>
</svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
