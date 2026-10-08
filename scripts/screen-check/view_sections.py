"""Tracker = eyes (frames), Clicker = hands (focus + keys). Writes only to the scratchpad."""
import os, shutil, sys, time
sys.dont_write_bytecode = True
TR = r"C:\Users\noman\Desktop\live-tracker"
SP = os.environ.get("SCREEN_CHECK_OUT", os.path.dirname(os.path.abspath(__file__)))
os.chdir(TR)
sys.path.insert(0, TR)
import clicker  # noqa: E402


def grab(name):
    for _ in range(8):
        try:
            shutil.copyfile(os.path.join(TR, ".live_frame.jpg"), os.path.join(SP, name))
            return
        except Exception:
            time.sleep(0.15)


chrome = clicker.Clicker("Google Chrome", shots=False)
claude = clicker.Clicker("Claude", shots=False)
try:
    chrome.focus(); time.sleep(0.6)
    chrome.press("end"); time.sleep(2.0); grab("sec_footer.jpg")
    chrome.press("pageup", presses=2); time.sleep(2.0); grab("sec_mid.jpg")
    chrome.press("home"); time.sleep(1.0)
    print("done; foreground was:", chrome._foreground_title())
finally:
    try:
        claude.focus(); print("focus returned to:", claude._foreground_title())
    except Exception as e:
        print("could not return focus:", e)
