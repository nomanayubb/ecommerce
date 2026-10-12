"""Hand-built vector concepts for the AVERIXA logo (A that becomes a cart). Run: python build_concepts.py"""
INK, GOLD = "#1c1c1e", "#c89c3a"
CREAM, CHAR = "#faf6ee", "#0f0f11"

DEFS = """
<defs>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f6e3a1"/><stop offset=".35" stop-color="#d9b04e"/>
    <stop offset=".7" stop-color="#b8892c"/><stop offset="1" stop-color="#8a6416"/>
  </linearGradient>
  <linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8a6416"/><stop offset=".5" stop-color="#f1d98c"/><stop offset="1" stop-color="#a97a22"/>
  </linearGradient>
  <linearGradient id="ink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2b2f"/><stop offset="1" stop-color="#121214"/></linearGradient>
  <linearGradient id="inkD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf7ee"/><stop offset="1" stop-color="#d9d2c2"/></linearGradient>
</defs>"""


def band(x0, y0, x1, y1, w):
    """Slanted band with horizontal cuts: bottom at (x0,y0), top at (x1,y1), horizontal width w."""
    return f"{x0},{y0} {x0+w},{y0} {x1+w},{y1} {x1},{y1}"


def _grid():
    xr = lambda y: 394 - (y - 92) * 34 / 170          # right diagonal x at height y
    d = []
    for y in (140, 180, 220):                           # horizontals
        d.append(f"M286 {y} L{xr(y)-12:.1f} {y}")
    for x0 in (308, 332, 356):                          # verticals follow the diagonal's slope
        d.append(f"M{x0} 128 L{x0-12:.1f} 244")
    return " ".join(d)


GRID = _grid()


def mark(ink="url(#ink)", dark=False):
    """The A + cart monogram in a 440x340 box."""
    i = "url(#inkD)" if dark else ink
    return f"""
  <g>
    <!-- A: left leg + fine parallel line -->
    <polygon points="{band(22,320,138,24,28)}" fill="{i}"/>
    <polygon points="{band(74,320,166,86,9)}" fill="{i}"/>
    <!-- A: right leg, broken near the crossbar like the original -->
    <polygon points="{band(170,24,192,24,0)}" fill="{i}"/>
    <polygon points="138,24 166,24 240,200 212,200" fill="{i}"/>
    <!-- crossbar flowing into the cart -->
    <polygon points="84,206 266,206 266,222 70,222" fill="url(#goldH)"/>
    <!-- cart: handle tick, right diagonal, basket floor, left side back up to the crossbar -->
    <path d="M436 92 L394 92 L360 262 L288 262 L266 214" fill="none" stroke="url(#gold)" stroke-width="15" stroke-linejoin="miter" stroke-miterlimit="10"/>
    <!-- basket grid, kept inside the basket -->
    <path d="{GRID}" stroke="url(#gold)" stroke-width="3" opacity=".5" fill="none"/>
    <!-- wheels -->
    <circle cx="312" cy="300" r="14" fill="none" stroke="url(#gold)" stroke-width="8"/>
    <circle cx="372" cy="300" r="14" fill="none" stroke="url(#gold)" stroke-width="8"/>
  </g>"""


LETTERS = {  # drawn on a 70-unit cap height; (advance width, svg path)
    "A": (66, "M3 70 L33 4 L63 70"),
    "V": (66, "M3 0 L33 66 L63 0"),
    "E": (48, "M45 4 H5 V66 H45 M5 35 H38"),
    "R": (54, "M5 70 V4 H34 Q50 4 50 21 Q50 38 34 38 H5 M26 38 L52 70"),
    "I": (14, "M7 0 V70"),
    "X": (64, "M2 2 L62 68 M62 2 L2 68"),
}


def wordmark(text="AVERIXA", color=INK, sw=9, gap=30, scale=1.0):
    x, parts = 0, []
    for ch in text:
        adv, d = LETTERS[ch]
        parts.append(f'<path transform="translate({x},0)" d="{d}" />')
        x += adv + gap
    w = x - gap
    g = f'<g fill="none" stroke="{color}" stroke-width="{sw}" stroke-linejoin="miter" stroke-miterlimit="12" stroke-linecap="butt" transform="scale({scale})">{"".join(parts)}</g>'
    return g, w * scale


def svg(w, h, body, bg=None):
    r = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{DEFS}{r}{body}</svg>'


def tagline(cx, y, color, size=17, spread=7):
    return (f'<text x="{cx}" y="{y}" text-anchor="middle" font-family="Montserrat,\'Segoe UI\',Arial,sans-serif" '
            f'font-weight="600" font-size="{size}" letter-spacing="{spread}" fill="{color}">YOUR WORLD  •  OUR STORE</text>')


def stacked(dark=False, bg=None):
    ink = "#f5f0e6" if dark else INK
    wm, ww = wordmark(color=ink, scale=1.25)
    W, H = 820, 640
    cx = W / 2
    body = f'<g transform="translate({cx-220},30) ">{mark(dark=dark)}</g>'
    body += f'<g transform="translate({cx-ww/2},385)">{wm}</g>'
    body += f'<rect x="105" y="539" width="115" height="1.6" fill="url(#goldH)"/><rect x="{W-220}" y="539" width="115" height="1.6" fill="url(#goldH)"/>'
    body += tagline(cx, 546, ink, 17, 6.5).replace('fill="', 'opacity=".9" fill="')
    return svg(W, H, body, bg)


def horizontal(dark=False, bg=None):
    ink = "#f5f0e6" if dark else INK
    wm, ww = wordmark(color=ink, scale=0.85, sw=9, gap=30)
    W, H = 214 + ww + 36, 140
    body = f'<g transform="translate(14,12) scale(.37)">{mark(dark=dark)}</g>'
    body += f'<g transform="translate(214,38)">{wm}</g>'
    return svg(round(W), H, body, bg)


def seal(dark=False, bg=None):
    ink = "#f5f0e6" if dark else INK
    ticks = "".join(f'<rect x="298" y="14" width="4" height="{16 if k%5==0 else 8}" transform="rotate({k*6} 300 300)" fill="url(#gold)"/>' for k in range(60))
    body = f"""<circle cx="300" cy="300" r="286" fill="none" stroke="url(#gold)" stroke-width="3"/>
    <circle cx="300" cy="300" r="268" fill="none" stroke="url(#gold)" stroke-width="1.2" opacity=".7"/>{ticks}
    <g transform="translate(158,118) scale(.64)">{mark(dark=dark)}</g>"""
    wm, ww = wordmark(color=ink, scale=.55, sw=9, gap=30)
    body += f'<g transform="translate({300-ww/2},372)">{wm}</g>'
    body += tagline(300, 458, ink, 12, 5)
    return svg(600, 600, body, bg)


out = {
    "stacked-light": stacked(False, CREAM), "stacked-dark": stacked(True, CHAR),
    "horizontal-light": horizontal(False, CREAM), "horizontal-dark": horizontal(True, CHAR),
    "seal-dark": seal(True, CHAR), "seal-light": seal(False, CREAM),
    "mark-light": svg(440, 340, mark(), CREAM), "mark-dark": svg(440, 340, mark(dark=True), CHAR),
}
for k, v in out.items():
    open(f"averixa-{k}.svg", "w", encoding="utf-8").write(v)
html = "<!doctype html><meta charset=utf-8><title>AVERIXA concepts</title><body style='margin:0;background:#888;display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;font:12px sans-serif'>" + "".join(
    f"<figure style='margin:0'><img src='averixa-{k}.svg' style='width:100%;display:block'><figcaption style='color:#fff'>{k}</figcaption></figure>" for k in out)
open("index.html", "w", encoding="utf-8").write(html)
print("ok", {k: len(v) for k, v in out.items()})

tiles = "".join(f"<figure><div class='t'>{v}</div><figcaption>{k}</figcaption></figure>" for k, v in out.items())
open("preview.html", "w", encoding="utf-8").write("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>AVERIXA logo concepts</title><style>body{margin:0;background:#6b6b6b;font:12px system-ui;color:#fff;padding:14px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px}figure{margin:0}.t svg{width:100%;height:auto;display:block}figcaption{padding:4px 2px;opacity:.85}</style><div class=g>"+tiles+"</div>")
