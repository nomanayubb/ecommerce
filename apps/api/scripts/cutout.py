"""Makes product photos with a plain white background transparent ("cut-outs").

  python scripts/cutout.py --sample 150     try 150 random photos, write a contact sheet for checking
  python scripts/cutout.py                  every photo in apps/web/public/kk

Only clean studio shots are touched (the frame of the picture is almost all white). The white that touches the picture
edge is removed; white parts inside the product stay. Result goes to public/kk/c/<same name>.webp (WebP with transparency)
and is cropped close to the product. Originals are never changed. Photos that fail a safety check are skipped.
"""
import argparse, os, random, sys, time
from multiprocessing import Pool
import cv2
import numpy as np

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "web", "public", "kk"))
OUT = os.path.join(SRC, "c")
WHITE = 236  # all three colour channels at or above this count as white


def cut(path):
    name = os.path.basename(path)
    try:
        data = np.fromfile(path, dtype=np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_UNCHANGED)
        if img is None or img.ndim != 3:
            return name, "unreadable"
        if img.shape[2] == 4:  # already has transparency
            return name, "has-alpha"
        h, w = img.shape[:2]
        white = (img >= WHITE).all(axis=2)
        frame = np.zeros((h, w), bool)
        t = max(2, int(min(h, w) * 0.01))
        frame[:t, :] = frame[-t:, :] = True
        frame[:, :t] = frame[:, -t:] = True
        if white[frame].mean() < 0.93:
            return name, "not-white-background"
        # seal hairline gaps so a white product edge is not joined to the background
        solid = (~white).astype(np.uint8)
        solid = cv2.morphologyEx(solid, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        bg_candidate = (solid == 0).astype(np.uint8)
        n, labels = cv2.connectedComponents(bg_candidate, connectivity=4)
        edge_labels = set(np.unique(labels[frame])) - {0}
        bg = np.isin(labels, list(edge_labels))
        fg = (~bg).astype(np.uint8)
        # drop specks, keep the biggest blobs
        n2, lab2, stats, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)
        if n2 <= 1:
            return name, "empty"
        keep = np.zeros(n2, bool)
        big = stats[1:, cv2.CC_STAT_AREA].max()
        for i in range(1, n2):
            if stats[i, cv2.CC_STAT_AREA] >= max(0.04 * big, 200):
                keep[i] = True
        fg = keep[lab2].astype(np.uint8)
        frac = fg.mean()
        if frac < 0.06 or frac > 0.92:
            return name, "bad-coverage"
        ys, xs = np.where(fg > 0)
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        if (y1 - y0) > 0.985 * h and (x1 - x0) > 0.985 * w:
            return name, "touches-all-sides"
        # soft edge: slight erode removes the white halo, blur makes the edge smooth
        fg = cv2.erode(fg, np.ones((2, 2), np.uint8), iterations=1)
        alpha = cv2.GaussianBlur(fg.astype(np.float32) * 255, (0, 0), 0.9)
        alpha = np.clip(alpha, 0, 255).astype(np.uint8)
        out = np.dstack([img, alpha])
        pad = int(0.04 * max(y1 - y0, x1 - x0))
        y0, y1 = max(0, y0 - pad), min(h, y1 + pad + 1)
        x0, x1 = max(0, x0 - pad), min(w, x1 + pad + 1)
        out = out[y0:y1, x0:x1]
        os.makedirs(OUT, exist_ok=True)
        ok, buf = cv2.imencode(".webp", out, [cv2.IMWRITE_WEBP_QUALITY, 82])
        if not ok:
            return name, "encode-failed"
        buf.tofile(os.path.join(OUT, name))
        return name, "ok"
    except Exception as e:  # never stop a long run for one picture
        return name, f"error:{e}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, default=0)
    ap.add_argument("--workers", type=int, default=10)
    a = ap.parse_args()
    files = sorted(os.path.join(SRC, f) for f in os.listdir(SRC) if f.endswith(".webp"))
    if a.sample:
        random.seed(7)
        files = random.sample(files, a.sample)
    else:
        files = [f for f in files if not os.path.exists(os.path.join(OUT, os.path.basename(f)))]
    print(f"photos to look at: {len(files)}", flush=True)
    t0 = time.time(); stats = {}; done = 0
    with Pool(a.workers) as p:
        for name, res in p.imap_unordered(cut, files, chunksize=20):
            stats[res.split(":")[0]] = stats.get(res.split(":")[0], 0) + 1
            done += 1
            if done % 1000 == 0:
                print(f"  {done}/{len(files)} {stats} {done / (time.time() - t0):.0f}/s", flush=True)
    print("finished", stats, f"{time.time() - t0:.0f}s", flush=True)
    if a.sample:
        ok = [os.path.join(OUT, os.path.basename(f)) for f in files if os.path.exists(os.path.join(OUT, os.path.basename(f)))][:48]
        tiles = []
        for f in ok:
            im = cv2.imdecode(np.fromfile(f, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
            s = 190 / max(im.shape[:2]); im = cv2.resize(im, (max(1, int(im.shape[1] * s)), max(1, int(im.shape[0] * s))))
            tile = np.full((200, 200, 3), (34, 30, 28), np.uint8)
            yy, xx = (200 - im.shape[0]) // 2, (200 - im.shape[1]) // 2
            a_ = im[:, :, 3:4].astype(np.float32) / 255
            tile[yy:yy + im.shape[0], xx:xx + im.shape[1]] = (im[:, :, :3] * a_ + tile[yy:yy + im.shape[0], xx:xx + im.shape[1]] * (1 - a_)).astype(np.uint8)
            tiles.append(tile)
        while len(tiles) % 8: tiles.append(np.zeros((200, 200, 3), np.uint8))
        rows = [np.hstack(tiles[i:i + 8]) for i in range(0, len(tiles), 8)]
        if rows:
            sheet = os.environ.get("SHEET", os.path.join(os.path.dirname(__file__), "cutout-sheet.jpg"))
            cv2.imencode(".jpg", np.vstack(rows))[1].tofile(sheet)
            print("sheet:", sheet)


if __name__ == "__main__":
    main()
