"""One-off patch (kept for reference): adds the Meta Pixel event hooks to every shop fork. Run from the repo root: python deploy/patch-pixel.py
Each replacement asserts that its anchor exists exactly once, so a fork that drifted fails loudly instead of being half patched."""
import re, shutil, sys
FORKS = ["web", "web-attire", "web-electronics", "web-mobiles", "web-autoparts"]
IMP = 'import { px, pxItems } from "@/lib/pixel";\n'

def edit(path, pairs, imp=None):
    s = open(path, encoding="utf8", newline="").read()
    crlf = "\r\n" in s
    s = s.replace("\r\n", "\n")
    for old, new in pairs:
        assert s.count(old) == 1, f"{path}: anchor not found exactly once: {old[:70]!r} (count {s.count(old)})"
        s = s.replace(old, new)
    if imp and imp not in s:
        m = re.search(r"^import .*\n", s, flags=re.M)
        s = s[:m.start()] + imp + s[m.start():]
    open(path, "w", encoding="utf8", newline="").write(s.replace("\n", "\r\n") if crlf else s)

for d in FORKS:
    b = f"apps/{d}/src"
    if d != "web":
        shutil.copyfile("apps/web/src/lib/pixel.ts", f"{b}/lib/pixel.ts")
        shutil.copyfile("apps/web/src/components/MetaPixel.tsx", f"{b}/components/MetaPixel.tsx")
    edit(f"{b}/app/layout.tsx", [("        </SiteProvider>\n      </body>", "        </SiteProvider>\n        {PIXEL_ID ? <MetaPixel /> : null}\n      </body>")],
         'import { MetaPixel } from "@/components/MetaPixel";\nimport { PIXEL_ID } from "@/lib/pixel";\n')
    edit(f"{b}/components/CartProvider.tsx", [("  const add = (l: CartLine) => {\n    setLines((cur) => merge(cur, l));", '  const add = (l: CartLine) => {\n    setLines((cur) => merge(cur, l));\n    px("AddToCart", { ...pxItems([l]), content_name: l.title });')], IMP)
    edit(f"{b}/components/BuyPanel.tsx", [('    setOpen(false);\n    router.push("/checkout?buynow=1");', '    const bl = { productId: p.id, quantity: qty, price: unit };\n    px("AddToCart", { ...pxItems([bl]), content_name: p.title });\n    px("BuyNowClick", { ...pxItems([bl]), content_name: p.title }, { custom: true });\n    setOpen(false);\n    router.push("/checkout?buynow=1");')], IMP)
    edit(f"{b}/components/RecentlyViewed.tsx", [("  useEffect(() => { pushRecent(p); }, [p.slug]);", '  useEffect(() => { pushRecent(p); px("ViewContent", { content_type: "product", content_ids: [p.id], content_name: p.title, value: p.price, currency: "PKR" }); }, [p.slug]);')], IMP)
    edit(f"{b}/components/Shopper.tsx", [("    return !has;\n  }, [wish]);", '    if (!has) px("AddToWishlist", { content_ids: [l.id], content_name: l.title, value: l.price, currency: "PKR" });\n    return !has;\n  }, [wish]);')], IMP)
    edit(f"{b}/components/SearchBox.tsx", [('if (t.length >= 2) { writeRecent(t); send("POST", "search/log", { q: t }).catch(() => {}); }', 'if (t.length >= 2) { writeRecent(t); px("Search", { search_string: t }); send("POST", "search/log", { q: t }).catch(() => {}); }')], IMP)
    edit(f"{b}/components/AuthForm.tsx", [("      await refresh();\n      router.replace(next);", '      await refresh();\n      if (mode === "register") px("CompleteRegistration", { status: true });\n      router.replace(next);')], IMP)
    edit(f"{b}/components/Effects.tsx", [(" your theme. No tracking.\n", ' your theme.{PIXEL_ID ? " Facebook may count visits and purchases to improve our ads." : " No tracking."}\n')], 'import { PIXEL_ID } from "@/lib/pixel";\n')
    edit(f"{b}/app/checkout/page.tsx", [
        ("  const lines = buyNowMode && buyNowLine ? [buyNowLine] : bag;\n", '  const lines = buyNowMode && buyNowLine ? [buyNowLine] : bag;\n  const sentIC = useRef(false);\n  useEffect(() => { if (flag === null || sentIC.current || !lines.length) return; sentIC.current = true; px("InitiateCheckout", pxItems(lines)); }, [flag, lines.length]); // eslint-disable-line react-hooks/exhaustive-deps\n'),
        ("      fireConfetti();", '      px("Purchase", { ...pxItems(lines), value: res.grandTotal }, { eventID: `order-${res.orderNumber}` });\n      fireConfetti();'),
    ], IMP)
    print("patched", d)
