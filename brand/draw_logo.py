"""Draws the Averixa logo candidates as SVG (pure geometry, no raster). Output: brand/drawn/*.svg + index.html preview.
Mark = gold "A" whose right leg becomes a gridded cart basket (clarity of v1) in flat, geometric shapes (cleanliness of v2)."""
from pathlib import Path

OUT = Path(__file__).parent / "drawn"
OUT.mkdir(exist_ok=True)

GOLD_HI, GOLD_LO = "#f1cf72", "#b7862a"
INK_HI, INK_LO = "#35353d", "#17171b"
CREAM, INK = "#faf6ee", "#1e1e23"

DEFS = f"""<defs>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{GOLD_HI}"/><stop offset="1" stop-color="{GOLD_LO}"/></linearGradient>
  <linearGradient id="goldv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GOLD_HI}"/><stop offset="1" stop-color="{GOLD_LO}"/></linearGradient>
  <linearGradient id="ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{INK_HI}"/><stop offset="1" stop-color="{INK_LO}"/></linearGradient>
</defs>"""


def mark(gold="url(#gold)", goldv="url(#goldv)", ink="url(#ink)", wheel_hole=CREAM):
    """Mark in a 1060 x 700 box."""
    return f"""<g>
  <!-- left leg + crossbar: gold -->
  <polygon points="240,60 360,60 155,600 35,600" fill="{gold}"/>
  <polygon points="231,400 509,400 532,460 208,460" fill="{goldv}"/>
  <!-- right leg: charcoal, becomes the cart's spine -->
  <polygon points="380,60 500,60 705,600 585,600" fill="{ink}"/>
  <!-- cart basket: gold frame + grid -->
  <path d="M596 238 H912 L850 462 H664 Z" fill="none" stroke="{gold}" stroke-width="32" stroke-linejoin="miter"/>
  <g stroke="{gold}" stroke-width="14">
    <line x1="660" y1="350" x2="888" y2="350"/>
    <line x1="700" y1="238" x2="676" y2="462"/><line x1="755" y1="238" x2="749" y2="462"/>
    <line x1="810" y1="238" x2="821" y2="462"/>
  </g>
  <!-- handle -->
  <path d="M912 238 L944 150 H1034" fill="none" stroke="{gold}" stroke-width="36" stroke-linejoin="miter"/>
  <!-- base + wheels -->
  <path d="M664 462 L706 560 H872" fill="none" stroke="{gold}" stroke-width="34" stroke-linejoin="miter"/>
  <g><circle cx="740" cy="626" r="36" fill="{ink}"/><circle cx="740" cy="626" r="13" fill="{wheel_hole}"/>
     <circle cx="846" cy="626" r="36" fill="{ink}"/><circle cx="846" cy="626" r="13" fill="{wheel_hole}"/></g>
</g>"""


LETTERS = {  # monoline geometric caps, 100 tall; value = (path, advance width)
    "A": ("M0 100 L45 0 L90 100 M21 68 H69", 90),
    "V": ("M0 0 L45 100 L90 0", 90),
    "E": ("M82 0 H0 V100 H82 M0 50 H72", 82),
    "R": ("M0 100 V0 H52 Q84 0 84 26 Q84 52 52 52 H0 M44 52 L84 100", 84),
    "I": ("M0 0 V100", 0),
    "X": ("M0 0 L90 100 M90 0 L0 100", 90),
}


def wordmark(color, x=0, y=0, size=1.0, weight=26, gap=58):
    parts, cx = [], 0
    for ch in "AVERIXA":
        d, adv = LETTERS[ch]
        parts.append(f'<path transform="translate({cx} 0)" d="{d}"/>')
        cx += adv + gap
    width = cx - gap
    g = (f'<g transform="translate({x} {y}) scale({size})" fill="none" stroke="{color}" stroke-width="{weight}" '
         f'stroke-linejoin="miter" stroke-miterlimit="2" stroke-linecap="butt">{"".join(parts)}</g>')
    return g, width * size


def tagline(color, cx, y, size=34, rule=GOLD_LO, span=900):
    return (f'<g><line x1="{cx - span / 2}" y1="{y - 12}" x2="{cx - span / 2 + 130}" y2="{y - 12}" stroke="{rule}" stroke-width="4"/>'
            f'<line x1="{cx + span / 2 - 130}" y1="{y - 12}" x2="{cx + span / 2}" y2="{y - 12}" stroke="{rule}" stroke-width="4"/>'
            f'<text x="{cx}" y="{y}" text-anchor="middle" font-family="Montserrat, \'Segoe UI\', Arial, sans-serif" font-weight="600" '
            f'font-size="{size}" letter-spacing="6" fill="{color}">YOUR WORLD · OUR STORE</text></g>')


def svg(w, h, body, bg=None):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{DEFS}{rect}{body}</svg>'


files = {}

# 1. stacked, full colour, transparent
wm, ww = wordmark(INK, size=1.0)
W = 1240
files["averixa-stacked-color"] = svg(W, 1100, f'<g transform="translate({(W - 1060) / 2} 20)">{mark()}</g>'
    + wordmark(INK, x=(W - ww) / 2, y=800)[0] + tagline("#3a3a42", W / 2, 1010, span=ww))
# 2. horizontal lockup
mk = f'<g transform="translate(10 10) scale(0.62)">{mark()}</g>'
wm2, ww2 = wordmark(INK, x=700, y=170, size=0.95, weight=24, gap=54)
files["averixa-horizontal-color"] = svg(1600, 470, mk + wm2 + tagline("#3a3a42", 700 + ww2 / 2, 340, size=26, span=ww2))
# 3. reversed on charcoal
files["averixa-stacked-on-dark"] = svg(W, 1100, f'<g transform="translate({(W - 1060) / 2} 20)">{mark(ink="url(#goldv)", wheel_hole=INK)}</g>'
    + wordmark(CREAM, x=(W - ww) / 2, y=800)[0] + tagline("#d9d3c4", W / 2, 1010, span=ww), bg=INK)
# 4. app icon tile
files["averixa-app-icon"] = svg(1024, 1024, f'<g transform="translate(70 215) scale(0.86)">{mark(ink="url(#goldv)", wheel_hole=INK)}</g>', bg=INK)
# 5. mark only, transparent
files["averixa-mark"] = svg(1100, 720, f'<g transform="translate(20 10)">{mark()}</g>')

for name, s in files.items():
    (OUT / f"{name}.svg").write_text(s, encoding="utf-8")

html = ["<!doctype html><meta charset=utf-8><title>Averixa logo candidates</title><body style='margin:0;background:#e9e4da;font:14px sans-serif'>",
        "<div style='display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:14px'>"]
for name in files:
    bg = "#fff" if "dark" not in name and "icon" not in name else "#444"
    html.append(f"<div style='background:{bg};padding:10px;text-align:center'><img src='{name}.svg' style='max-width:100%;height:340px'><div style='color:#888'>{name}</div></div>")
html.append("</div>")
(OUT / "index.html").write_text("".join(html), encoding="utf-8")
print(sorted(f.name for f in OUT.iterdir()))
