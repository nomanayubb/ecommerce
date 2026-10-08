"""Builds optimized logo assets from brand-source/logo.jpg (a logo on a flat light background).
Re-run after replacing the source:  python scripts/build-brand.py
Outputs go to apps/web/public/brand and apps/admin/public/brand.
Ink (dark) pixels are recoloured per variant; any saturated colour (e.g. gold) is kept as-is."""
import os, shutil
import numpy as np
from PIL import Image

SRC = "brand-source/logo.jpg"
OUT = ["apps/web/public/brand", "apps/admin/public/brand"]
INK_LIGHT = (30, 30, 32)      # ink on light backgrounds
INK_DARK = (245, 240, 230)    # ink on dark backgrounds
CREAM = (250, 246, 238)       # page background used for icons / share image

im = np.asarray(Image.open(SRC).convert("RGB")).astype(float)
h, w, _ = im.shape
bg = np.median(np.concatenate([im[:20].reshape(-1, 3), im[-20:].reshape(-1, 3)]), axis=0)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
sat = (np.max(im, 2) - np.min(im, 2))
is_color = sat > 45
# alpha: how far each pixel is from the background (luminance for ink, blue channel for gold)
lum = 0.299 * r + 0.587 * g + 0.114 * b
a_ink = np.clip((bg @ [0.299, 0.587, 0.114] - lum) / (bg @ [0.299, 0.587, 0.114] - 30), 0, 1)
a_col = np.clip((bg[2] - b) / (bg[2] - 50), 0, 1)
alpha = np.where(is_color, a_col, a_ink)
alpha = np.where(alpha < 0.03, 0, alpha)

# sample the accent colour from solid colour pixels
solid = is_color & (alpha > 0.95)
accent = tuple(int(v) for v in np.median(im[solid], axis=0)) if solid.any() else (200, 154, 58)


def layer(ink):
    out = np.zeros((h, w, 4), np.uint8)
    rgb = np.where(is_color[..., None], accent, ink)
    out[..., :3] = np.clip(rgb, 0, 255)
    out[..., 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def bbox(img, y0, y1, x0=0, x1=None):
    a = np.asarray(img)[y0:y1, x0:x1, 3]
    ys, xs = np.where(a > 20)
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1)


# split rows by empty bands: mark (top), wordmark, tagline
rows = np.where((alpha > 0.08).sum(1) > 0)[0]
bands, start = [], rows[0]
for prev, cur in zip(rows, rows[1:]):
    if cur - prev > 18:
        bands.append((start, prev + 1)); start = cur
bands.append((start, rows[-1] + 1))
print("bands", bands, "accent", accent)
mark_y, word_y = bands[0], bands[1]


def save(img, name, width=None, height=None):
    if width: img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    if height: img = img.resize((round(img.width * height / img.height), height), Image.LANCZOS)
    for d in OUT:
        os.makedirs(d, exist_ok=True)
        img.save(f"{d}/{name}.png", optimize=True)
        img.save(f"{d}/{name}.webp", quality=90, method=6)
    return img


for tag, ink in (("", INK_LIGHT), ("-dark", INK_DARK)):
    full = layer(ink)
    pad = 6
    L = lambda y0, y1: full.crop(bbox(full, y0, y1))
    mark, word = L(*mark_y), L(*word_y)
    whole = full.crop(bbox(full, 0, h))
    save(whole, f"logo-full{tag}", width=720)
    save(mark, f"logo-mark{tag}", height=192)
    # horizontal lockup for headers: mark + wordmark at equal visual weight
    mh, wh = 120, 56
    m2 = mark.resize((round(mark.width * mh / mark.height), mh), Image.LANCZOS)
    w2 = word.resize((round(word.width * wh / word.height), wh), Image.LANCZOS)
    gap = 28
    canvas = Image.new("RGBA", (m2.width + gap + w2.width, mh), (0, 0, 0, 0))
    canvas.paste(m2, (0, 0), m2)
    canvas.paste(w2, (m2.width + gap, (mh - wh) // 2), w2)
    save(canvas, f"logo-horizontal{tag}")

# app icons: dark mark on cream, padded
mark = layer(INK_LIGHT).crop(bbox(layer(INK_LIGHT), *mark_y))
def icon(size):
    s = Image.new("RGBA", (size, size), CREAM + (255,))
    m = mark.resize((round(size * 0.66), round(size * 0.66 * mark.height / mark.width)), Image.LANCZOS)
    s.paste(m, ((size - m.width) // 2, (size - m.height) // 2), m)
    return s
for d in OUT:
    pub = os.path.dirname(d)
    icon(512).save(f"{d}/icon-512.png", optimize=True)
    icon(192).save(f"{d}/icon-192.png", optimize=True)
    icon(180).save(f"{d}/apple-touch-icon.png", optimize=True)
    icon(64).save(f"{pub}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    # social share image
    og = Image.new("RGB", (1200, 630), CREAM)
    full = layer(INK_LIGHT); wl = full.crop(bbox(full, 0, h))
    wl = wl.resize((round(wl.width * 520 / wl.height), 520), Image.LANCZOS)
    og.paste(wl, ((1200 - wl.width) // 2, 55), wl)
    og.save(f"{d}/og-image.jpg", quality=88, optimize=True, progressive=True)
print("done")
