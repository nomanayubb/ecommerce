"""Builds a brand kit from brand/source/logo-original.jpg (cream background, mark on top, wordmark, tagline).
Re-run for another project by swapping the source image and the colors below. Needs: pillow, numpy."""
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).parent
OUT = ROOT / "out"
NAVY, GOLD, CREAM, DARK = (31, 43, 71), (201, 151, 43), (251, 247, 240), (11, 15, 26)

src = Image.open(ROOT / "source/logo-original.jpg").convert("RGB")
a = np.asarray(src).astype(np.float32)
bg = np.median(np.concatenate([a[:20].reshape(-1, 3), a[-20:].reshape(-1, 3)]), axis=0)

# alpha from distance to the background colour; un-premultiply so edges carry no cream halo
d = np.abs(a - bg).max(axis=2)
alpha = np.clip((d - 6) / 34, 0, 1)
fg = np.where(alpha[..., None] > 0.02, (a - (1 - alpha[..., None]) * bg) / np.maximum(alpha[..., None], 0.02), 0)
fg = np.clip(fg, 0, 255)
rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)
full = Image.fromarray(rgba, "RGBA")

# split into bands (mark / wordmark / tagline) by empty rows
rows = (alpha > 0.35).sum(axis=1) > 3
bands, start = [], None
for y, on in enumerate(rows):
    if on and start is None: start = y
    if not on and start is not None:
        if y - start > 8: bands.append((start, y))
        start = None
bands = [b for i, b in enumerate(bands)]
merged = []
for b in bands:
    if merged and b[0] - merged[-1][1] < 18: merged[-1] = (merged[-1][0], b[1])
    else: merged.append(b)
assert len(merged) >= 3, merged
(m0, m1), (w0, w1), (t0, t1) = merged[0], merged[1], merged[2]

def crop_box(img, y0, y1, pad=24):
    al = np.asarray(img)[..., 3]
    sub = al[y0:y1] > 40
    xs = np.where(sub.any(axis=0))[0]
    return img.crop((max(0, xs[0] - pad), max(0, y0 - pad), min(img.width, xs[-1] + pad), min(img.height, y1 + pad)))

mark = crop_box(full, m0, m1)
word = crop_box(full, w0, w1)
tag = crop_box(full, t0, t1)
lum = np.asarray(full.convert("L")).astype(np.float32)

def flat(img, color, keep_shading=True):
    """Solid-colour silhouette; optional subtle luminance shading so bevels survive."""
    arr = np.asarray(img).astype(np.float32)
    l = np.asarray(img.convert("L")).astype(np.float32)
    s = (0.72 + 0.28 * (l - l.min()) / max(1, l.max() - l.min())) if keep_shading else 1
    s = np.asarray(s)[..., None] if keep_shading else 1
    rgb = np.clip(np.array(color, np.float32) * s, 0, 255)
    rgb = np.broadcast_to(rgb, arr[..., :3].shape)
    return Image.fromarray(np.dstack([rgb, arr[..., 3]]).astype(np.uint8), "RGBA")

def canvas(w, h, color=None):
    return Image.new("RGBA", (w, h), (*color, 255) if color else (0, 0, 0, 0))

def paste_center(base, im, box, scale=1.0):
    bw, bh = box[2] - box[0], box[3] - box[1]
    r = min(bw / im.width, bh / im.height) * scale
    im2 = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
    base.alpha_composite(im2, (box[0] + (bw - im2.width) // 2, box[1] + (bh - im2.height) // 2))
    return base

def lockup_h(mark_im, word_im, gap=60, h=420):
    m = mark_im.resize((int(mark_im.width * h / mark_im.height), h), Image.LANCZOS)
    wh = int(h * 0.42)
    w = word_im.resize((int(word_im.width * wh / word_im.height), wh), Image.LANCZOS)
    c = canvas(m.width + gap + w.width, h)
    c.alpha_composite(m, (0, 0)); c.alpha_composite(w, (m.width + gap, (h - wh) // 2))
    return c

variants = {}
# 01 primary: original lockup, cream background, tightly cropped
v = canvas(2000, 2000, CREAM); v.alpha_composite(full)
variants["01-primary-lockup"] = crop_box(v.convert("RGBA").copy(), 0, 2000, 60) if False else v.crop((120, m0 - 90, 1880, t1 + 90))
variants["02-lockup-transparent"] = crop_box(full, m0, t1)
variants["03-mark-transparent"] = mark
variants["04-horizontal-lockup"] = lockup_h(mark, word)
variants["05-mark-navy-mono"] = flat(mark, NAVY)
variants["06-mark-gold-mono"] = flat(mark, GOLD)
variants["07-lockup-white-reverse"] = flat(crop_box(full, m0, t1), (255, 255, 255))
t = canvas(1024, 1024, NAVY); m = flat(mark, (226, 182, 74)); paste_center(t, m, (110, 150, 914, 874))
mask = Image.new("L", t.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, 1023, 1023), 230, fill=255); t.putalpha(mask)
variants["08-app-icon-navy"] = t
b = canvas(1024, 1024); dr = ImageDraw.Draw(b)
dr.ellipse((8, 8, 1016, 1016), fill=(*CREAM, 255)); dr.ellipse((8, 8, 1016, 1016), outline=(*GOLD, 255), width=22)
dr.ellipse((60, 60, 964, 964), outline=(*NAVY, 255), width=5); paste_center(b, mark, (170, 230, 854, 800))
variants["09-circular-badge"] = b
s = canvas(1400, 1100, DARK); paste_center(s, flat(mark, (226, 182, 74)), (250, 70, 1150, 660))
paste_center(s, flat(word, (245, 240, 230), False), (150, 700, 1250, 900)); paste_center(s, flat(tag, (245, 240, 230), False), (250, 940, 1150, 1040), 0.9)
variants["10-stacked-on-dark"] = s

for k, im in variants.items():
    im.save(OUT / f"{k}.png", optimize=True)

# website assets
def webp(im, name, width, q=88):
    r = width / im.width
    im.resize((width, max(1, int(im.height * r))), Image.LANCZOS).save(OUT / name, "WEBP", quality=q, method=6)
webp(mark, "logo-mark.webp", 360)
webp(variants["04-horizontal-lockup"], "logo-horizontal.webp", 720)
webp(variants["02-lockup-transparent"], "logo-full.webp", 900)
webp(variants["07-lockup-white-reverse"], "logo-full-white.webp", 900)
for n in (512, 192, 64):
    variants["08-app-icon-navy"].resize((n, n), Image.LANCZOS).save(OUT / f"icon-{n}.png", optimize=True)
variants["08-app-icon-navy"].resize((64, 64), Image.LANCZOS).save(OUT / "favicon.ico", sizes=[(64, 64), (32, 32), (16, 16)])
og = canvas(1200, 630, CREAM); paste_center(og, variants["02-lockup-transparent"], (60, 30, 1140, 600))
og.convert("RGB").save(OUT / "og-image.jpg", quality=88, optimize=True)

# contact sheet for comparison
sheet = Image.new("RGB", (2500, 1100), (236, 232, 224)); d2 = ImageDraw.Draw(sheet)
for i, (k, im) in enumerate(variants.items()):
    col, row = i % 5, i // 5
    cell = (col * 500 + 10, row * 550 + 10, col * 500 + 490, row * 550 + 500)
    bgc = (255, 255, 255) if k not in ("07-lockup-white-reverse",) else (20, 26, 42)
    d2.rectangle(cell, fill=bgc)
    tmp = Image.new("RGBA", (cell[2] - cell[0], cell[3] - cell[1]), (*bgc, 255)); paste_center(tmp, im, (20, 20, tmp.width - 20, tmp.height - 20))
    sheet.paste(tmp.convert("RGB"), (cell[0], cell[1]))
    d2.text((cell[0] + 6, cell[3] + 8), k, fill=(40, 40, 40))
sheet.save(OUT / "contact-sheet.jpg", quality=85)
print("bands", merged, "files", sorted(p.name for p in OUT.iterdir()))
