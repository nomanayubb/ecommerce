"""Uses the live-tracker (read-only for its code) + its Clicker to check the store's animations on the REAL screen.
Run with the tracker venv python and -B (no bytecode written into the tracker folder). Writes only to the scratchpad."""
import os, shutil, sys, time
sys.dont_write_bytecode = True
TR = r"C:\Users\noman\Desktop\live-tracker"
SP = os.environ.get("SCREEN_CHECK_OUT", os.path.dirname(os.path.abspath(__file__)))
os.chdir(TR)
sys.path.insert(0, TR)
import cv2, numpy as np
import clicker  # noqa: E402

FRAME = os.path.join(TR, ".live_frame.jpg")
ICON_XY = (1461, 229)                      # Animations icon, seen in the earlier real-screen frame (1920x1080, page at top)
GLOW = (800, 300, 1500, 900)               # x0, y0, x1, y1 : hero glow area
LINE = (1100, 330, 1740, 960)              # line art area


def grab(name):
    dst = os.path.join(SP, name)
    for _ in range(8):
        try:
            shutil.copyfile(FRAME, dst)
            img = cv2.imread(dst)
            if img is not None:
                return img
        except Exception:
            pass
        time.sleep(0.15)
    raise RuntimeError("could not read live frame")


def crop(img, box):
    x0, y0, x1, y1 = box
    return img[y0:y1, x0:x1]


def change(a, b, box):
    return float(np.mean(cv2.absdiff(crop(a, box), crop(b, box))))


def sample(label, n=5, gap=1.2):
    frames = []
    for i in range(n):
        frames.append(grab(f"{label}_{i}.jpg"))
        time.sleep(gap)
    ch_glow = [round(change(a, b, GLOW), 2) for a, b in zip(frames, frames[1:])]
    ch_line = [round(change(a, b, LINE), 2) for a, b in zip(frames, frames[1:])]
    return ch_glow, ch_line


chrome = clicker.Clicker("Google Chrome", shots=False)
claude = clicker.Clicker("Claude", shots=False)
try:
    chrome.focus()
    time.sleep(0.6)
    chrome.press("home")                       # make sure the page is at the top
    time.sleep(1.2)
    base = grab("base.jpg")
    print("foreground now:", chrome._foreground_title())

    # safety: gold icon strokes must be present at the expected spot (header at top of the store page)
    x, y = ICON_XY
    box = base[y - 18:y + 18, x - 22:x + 22].astype(int)
    gold = int(((abs(box[:, :, 2] - 212) < 45) & (abs(box[:, :, 1] - 170) < 45) & (abs(box[:, :, 0] - 70) < 60)).sum())
    header_dark = float(base[200:260, 300:1100].mean())
    print(f"gold pixels at icon spot: {gold}; header darkness mean: {header_dark:.1f}")
    score, loc = 1.0, (x - 24, y - 20)

    g, l = sample("before")
    print("BEFORE clicking Animations -> hero glow change per second:", g, "| line art:", l)

    ok = gold >= 5 and header_dark < 60
    if ok:
        r = chrome.click_at(x, y, relative=False, desc="toggle Animations icon on the store header")
        print("clicked:", r["ok"])
        time.sleep(1.0)
        g2, l2 = sample("after")
        print("AFTER clicking Animations -> hero glow change per second:", g2, "| line art:", l2)
    else:
        print("icon not where expected; NOT clicking")
finally:
    try:
        claude.focus()
        print("focus returned to:", claude._foreground_title())
    except Exception as e:
        print("could not return focus:", e)
