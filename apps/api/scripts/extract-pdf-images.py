"""Saves the one picture on every page of an image-only catalogue PDF as pNN.png (used for the Bonanza winter PDF: each page is one product card).
    python scripts/extract-pdf-images.py "C:/path/Bonanza Winter.pdf" data/attire/bonanza-winter
"""
import os, sys
import pymupdf

pdf, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
doc = pymupdf.open(pdf)
for i, page in enumerate(doc, 1):
    pix = pymupdf.Pixmap(doc, page.get_images()[0][0])
    if pix.n - pix.alpha > 3:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    pix.save(os.path.join(out, f"p{i:02d}.png"))
print(f"{len(doc)} pages -> {out}")
