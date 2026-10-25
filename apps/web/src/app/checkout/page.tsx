"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { pkr, type FieldMode, type PayMethod } from "@/lib/api";
import { useSite } from "@/components/Site";
import { send } from "@/lib/client";
import { useSession } from "@/components/SessionProvider";
import { useCart } from "@/components/CartProvider";
import { MascotFigure } from "@/components/Mascot";
import { GiftOptions, PromoField, useCartPricing } from "@/components/CartExtras";
import { fireConfetti, mascotSay } from "@/lib/motion";
import { TCS_CITIES, loadAreas, tcsCity } from "@/lib/tcs-cities";
import { CityPicker } from "@/components/CityPicker";
import { AreaInput } from "@/components/AreaInput";
import { latinInput, latinOnly, noNonLatin } from "@/lib/latin";
import { PrintButton } from "@/components/PrintButton";
import { DispatchNote } from "@/components/Dispatch";

function Steps({ at }: { at: 1 | 2 | 3 }) {
  const items = ["Delivery", "Payment", "Done"];
  return (
    <ol className="mb-10 flex items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em]" aria-label="Checkout progress">
      {items.map((t, i) => (
        <li key={t} className="flex items-center gap-3" aria-current={at === i + 1 ? "step" : undefined}>
          <span className={`grid h-6 w-6 place-items-center border text-[0.6rem] ${at > i + 1 ? "border-accent bg-accent text-onbrand" : at === i + 1 ? "border-accent text-accent" : "border-line text-muted"}`}>{at > i + 1 ? "✓" : i + 1}</span>
          <span className={at >= i + 1 ? "text-fg" : "text-muted"}>{t}</span>
          {i < items.length - 1 && <span aria-hidden className="h-px w-8 bg-line sm:w-14" />}
        </li>
      ))}
    </ol>
  );
}

export default function Checkout() {
  const { lines: bag, clear, extras, setExtras, buyNowLine, setBuyNow, setQty } = useCart();
  // "Buy now" opens /checkout?buynow=1 and orders only that product; the normal Checkout button (no address flag) orders the whole bag.
  const [flag, setFlag] = useState<boolean | null>(null);
  useEffect(() => { setFlag(new URLSearchParams(window.location.search).get("buynow") === "1"); }, []);
  const buyNowMode = flag === true && !!buyNowLine;
  const lines = buyNowMode && buyNowLine ? [buyNowLine] : bag;
  // Remove is only for the normal checkout (whole bag); a Buy now order is the one product with no Remove.
  const removeLine = (l: { productId: string; variantId: string | null }) => setQty(l.productId, l.variantId, 0);
  // Quantity steps (1 to 99): the whole bag in normal checkout, the one product in a Buy now order.
  const changeQty = (l: { productId: string; variantId: string | null; quantity: number }, q: number) => {
    const next = Math.min(99, Math.max(1, q));
    if (buyNowMode && buyNowLine) setBuyNow({ ...buyNowLine, quantity: next }); else setQty(l.productId, l.variantId, next);
  };
  const errRef = useRef<HTMLParagraphElement>(null);
  const [saveAddr, setSaveAddr] = useState(false);
  const { priced, error: priceError } = useCartPricing(lines);
  const { user, ready } = useSession();
  const [saved, setSaved] = useState<{ id: string; label: string | null; name: string; phone: string; line1: string; city: string; postal_code: string | null; is_default: boolean }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [phoneHint, setPhoneHint] = useState(false);
  const { store } = useSite();
  const cf: Record<"email" | "phone" | "address" | "city" | "postalCode" | "note" | "house" | "street" | "area" | "extra", FieldMode> = { email: "hidden", phone: "required", address: "required", city: "required", postalCode: "optional", note: "optional", house: "required", street: "required", area: "required", extra: "optional", ...(store.checkoutFields ?? {}) };
  const methods: PayMethod[] = (store.paymentMethods ?? []).filter((m) => m.enabled);
  const [pay, setPay] = useState<string>("");
  const payId = pay || methods[0]?.id || "COD";
  const [done, setDone] = useState<{ orderNumber: number; grandTotal: number; message?: string; method?: string } | null>(null);

  const [cityVal, setCityVal] = useState("");
  // Area suggestions: once a TCS city is chosen its area list loads (a typing box that finds matches; any area can still be written).
  const [areas, setAreas] = useState<string[]>([]);
  useEffect(() => {
    const c = tcsCity(cityVal);
    let live = true;
    if (!c) { setAreas([]); return; }
    loadAreas(c).then((l) => { if (live) setAreas(l); });
    return () => { live = false; };
  }, [cityVal]);
  // Name, phone, city, house, street and area are mandatory: leaving one empty (or sending the form with it empty) shows a red message right under the box.
  const [miss, setMiss] = useState<Record<string, boolean>>({});
  const need = (k: string, empty: boolean) => setMiss((m) => (m[k] === empty ? m : { ...m, [k]: empty }));
  const bad = (k: string, msg: string) => miss[k] ? <p role="alert" className="mt-1.5 text-xs font-medium text-red-400">{msg}</p> : null;
  const watch = (k: string, req: boolean) => ({ onBlur: (e: React.FocusEvent<HTMLInputElement>) => { if (req) need(k, !e.target.value.trim()); }, onInvalid: () => need(k, true), "aria-invalid": miss[k] ? true : undefined });

  // Structured address: house, street and area are filled in separate boxes and joined into the Address box automatically.
  const [house, setHouse] = useState("");
  const [streetNo, setStreetNo] = useState("");
  const [areaTxt, setAreaTxt] = useState("");
  const [extra, setExtra] = useState("");
  const [addr, setAddr] = useState("");
  const areaName = areaTxt.trim();
  useEffect(() => {
    const parts = [house.trim(), streetNo.trim(), areaName, extra.trim()].filter(Boolean);
    if (parts.length) setAddr(parts.join(", "));
  }, [house, streetNo, areaName, extra]);
  useEffect(() => { if (house.trim()) need("house", false); }, [house]);       // the red message goes as soon as the box has text
  useEffect(() => { if (streetNo.trim()) need("street", false); }, [streetNo]);
  useEffect(() => { if (areaTxt.trim()) need("area", false); }, [areaTxt]);
  useEffect(() => { if (extra.trim()) need("extra", false); }, [extra]);

  const payload = lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }));

  type Addr = (typeof saved)[number];
  const fillAddr = (a: Addr) => {
    const form = document.getElementById("checkout-form") as HTMLFormElement | null;
    if (!form) return;
    const set = (n: string, v: string) => { if (n === "line1") { setAddr(v); return; } if (n === "city" && !store.allowManualCity) { setCityVal(tcsCity(v)); return; } const el = form.elements.namedItem(n) as HTMLInputElement | null; if (el) el.value = n === "city" && !store.allowManualCity ? tcsCity(v) : v; };
    set("name", a.name); set("phone", a.phone); set("line1", a.line1); set("city", a.city); set("postalCode", a.postal_code ?? ""); if (store.allowManualCity) setCityVal(a.city);
  };
  // Guests: bring back the details used last time on this device.
  useEffect(() => {
    if (user || !ready) return;
    try {
      const d = JSON.parse(localStorage.getItem("checkout-details") ?? "null");
      if (!d) return;
      setTimeout(() => {
        const form = document.getElementById("checkout-form") as HTMLFormElement | null;
        if (!form) return;
        if (d.line1) setAddr((cur) => cur || String(d.line1));
        for (const k of store.allowManualCity ? ["name", "phone", "city", "postalCode"] : ["name", "phone", "postalCode"]) { const el = form.elements.namedItem(k) as HTMLInputElement | null; if (el && !el.value && d[k]) el.value = k === "city" && !store.allowManualCity ? tcsCity(String(d[k])) : d[k]; }
        if (d.city) setCityVal(store.allowManualCity ? String(d.city) : tcsCity(String(d.city)));
      }, 0);
    } catch {}
  }, [user, ready]);
  useEffect(() => {
    if (!user) return;
    send<Addr[]>("GET", "account/addresses").then((list) => { setSaved(list); const d = list.find((x) => x.is_default); if (d) setTimeout(() => fillAddr(d), 0); }).catch(() => {});
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const fullLine1 = addr.trim();
      const res = await send<{ orderNumber: number; grandTotal: number; paymentInstructions?: { type: string; message: string; method?: string } }>("POST", "checkout/process", {
        items: payload,
        shippingAddress: { name: f.get("name"), email: f.get("email") || undefined, phone: f.get("phone") || undefined, line1: fullLine1 || undefined, city: f.get("city") || undefined, postalCode: f.get("postalCode") || undefined, country: "PK" },
        notes: extras.note || undefined,
        couponCode: extras.coupon || undefined,
        giftWrap: extras.giftWrap || undefined,
        giftMessage: extras.giftWrap ? extras.giftMessage || undefined : undefined,
        paymentMethod: payId,
      });
      try { localStorage.setItem("checkout-details", JSON.stringify({ name: f.get("name"), phone: f.get("phone"), line1: f.get("line1"), city: f.get("city"), postalCode: f.get("postalCode") })); } catch {}
      try { sessionStorage.setItem("last-order", JSON.stringify({ number: res.orderNumber, phone: String(f.get("phone") ?? "") })); } catch {}
      if (user && saveAddr) send("POST", "account/addresses", { name: f.get("name"), phone: f.get("phone"), line1: fullLine1, city: f.get("city"), postalCode: f.get("postalCode") || undefined, isDefault: false }).catch(() => {});
      if (buyNowMode) { setBuyNow(null); setExtras({ coupon: "", giftWrap: false, giftMessage: "" }); } else clear();
      setDone({ orderNumber: res.orderNumber, grandTotal: res.grandTotal, message: res.paymentInstructions?.type === "MANUAL_TRANSFER" ? res.paymentInstructions.message : undefined, method: res.paymentInstructions?.method });
      fireConfetti();
      mascotSay("celebrate", "Order placed. Thank you!");
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setTimeout(() => { errRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); errRef.current?.focus(); }, 50);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <MascotFigure mood="celebrate" size={120} className="mx-auto mb-4 text-fg" />
        <Steps at={3} />
        <p className="eyebrow">Order confirmed</p>
        <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[0.1em]">Thank you</h1>
        <p className="mt-4 text-muted">Your order <strong className="text-fg">#{done.orderNumber}</strong> has been placed. {done.message ? <>Please pay <strong className="text-fg">{pkr(done.grandTotal)}</strong> by {done.method}.</> : <>Please keep <strong className="text-fg">{pkr(done.grandTotal)}</strong> ready to pay in cash on delivery.</>}</p>{done.message && <p className="mx-auto mt-4 max-w-sm whitespace-pre-line border border-line bg-card p-4 text-sm">{done.message}</p>}
        <div className="mt-10 flex flex-wrap justify-center gap-4"><Link href="/track" className="btn btn-primary">Track this order</Link><Link href="/products" className="btn btn-ghost">Continue shopping</Link><PrintButton className="btn btn-ghost" /></div>
        {ready && !user && <p className="mx-auto mt-8 max-w-sm border border-line bg-card p-4 text-sm text-muted">Want to see this order and your next ones in one place? <Link href="/register" className="text-accent hover:underline">Create a free account</Link>.</p>}
      </div>
    );

  if (flag === null) return <div className="py-24" aria-busy="true" />;

  if (lines.length === 0)
    return (
      <div className="py-24 text-center">
        <MascotFigure mood="sad" size={96} className="mx-auto mb-4 text-fg" />
        <p className="eyebrow">Checkout</p>
        <p className="mt-3 text-muted">Your bag is empty.</p>
        <Link href="/products" className="btn btn-primary mt-8">Browse the collection</Link>
      </div>
    );

  const field = "w-full border border-line bg-card px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent";
  const label = "mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted";

  return (
    <>
      <h1 className="mb-6 text-3xl font-semibold uppercase tracking-[0.1em]">Checkout</h1>
      <Steps at={1} />
      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="space-y-10" id="checkout-form">
          <section>
            <h2 className="eyebrow mb-5">1 · Delivery details</h2>
            {ready && !user && <p className="mb-5 border border-line bg-card px-4 py-3 text-sm text-muted"><a href="/login?next=/checkout" className="text-accent hover:underline">Sign in</a> for faster checkout and order history, or continue as a guest.</p>}
            {saved.length > 0 && (
              <label className="mb-5 block"><span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">Use a saved address</span>
                <select onChange={(e) => { const a = saved.find((x) => x.id === e.target.value); if (a) fillAddr(a); }} defaultValue={saved.find((x) => x.is_default)?.id} className="w-full border border-line bg-card px-4 py-3 text-sm">
                  {saved.map((x) => <option key={x.id} value={x.id}>{x.label || x.line1} · {x.city}</option>)}
                </select>
              </label>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={label}>Full name</span><input name="name" required autoComplete="name" className={`${field} ${miss.name ? "!border-red-400" : ""}`} {...latinInput} {...watch("name", true)} onChange={() => need("name", false)} />{bad("name", "Please enter your full name")}</label>
              {cf.email !== "hidden" && <label className="sm:col-span-2"><span className={label}>Email{cf.email === "optional" ? " (optional)" : ""}</span><input name="email" type="email" required={cf.email === "required"} autoComplete="email" className={field} /></label>}
              {cf.phone !== "hidden" && <label><span className={label}>Phone{cf.phone === "optional" ? " (optional)" : ""}</span><input name="phone" required={cf.phone === "required"} type="tel" autoComplete="tel" placeholder="03XX XXXXXXX" minLength={7} className={`${field} ${miss.phone ? "!border-red-400" : ""}`} {...watch("phone", cf.phone === "required")} onChange={(e) => { need("phone", false); const d = e.target.value.replace(/\D/g, ""); setPhoneHint(d.length > 0 && !/^(92|0)?3\d{9}$/.test(d) && !/^0\d{9,10}$/.test(d)); }} />{phoneHint && <span className="mt-1 block text-xs text-accent">Mobile numbers look like 03XX XXXXXXX. Please double-check so the courier can reach you.</span>}{bad("phone", "Please enter your phone number")}</label>}
              {(cf.city !== "hidden" || cf.house !== "hidden" || cf.street !== "hidden" || cf.area !== "hidden" || cf.extra !== "hidden") && <fieldset className="grid gap-4 border border-line p-4 sm:col-span-2 sm:grid-cols-2 sm:p-5">
              <legend className="px-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent">Address</legend>
              {cf.city !== "hidden" && <label><span className={label}>City{cf.city === "optional" ? " (optional)" : ""}</span>{store.allowManualCity
                ? <><input name="city" required={cf.city === "required"} list="tcs-cities" autoComplete="address-level2" className={field} onChange={(e) => setCityVal(latinOnly(e.target.value))} {...latinInput} /><datalist id="tcs-cities">{TCS_CITIES.map((c) => <option key={c} value={c} />)}</datalist></>
                : <CityPicker cities={TCS_CITIES} value={cityVal} onChange={setCityVal} required={cf.city === "required"} className={field} />}</label>}
              <>
                {(cf.house !== "hidden" || cf.street !== "hidden" || cf.area !== "hidden") && <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
                  {cf.house !== "hidden" && <label><span className={label}>House name or number{cf.house === "optional" ? " (optional)" : ""}</span><input value={house} onChange={(e) => setHouse(latinOnly(e.target.value))} onBeforeInput={noNonLatin} required={cf.house === "required"} placeholder="e.g. House 12" autoComplete="off" className={`${field} ${miss.house ? "!border-red-400" : ""}`} {...watch("house", cf.house === "required")} />{bad("house", "Please enter your house name or number")}</label>}
                  {cf.street !== "hidden" && <label><span className={label}>Street name or number{cf.street === "optional" ? " (optional)" : ""}</span><input value={streetNo} onChange={(e) => setStreetNo(latinOnly(e.target.value))} onBeforeInput={noNonLatin} required={cf.street === "required"} placeholder="e.g. Street 5" autoComplete="off" className={`${field} ${miss.street ? "!border-red-400" : ""}`} {...watch("street", cf.street === "required")} />{bad("street", "Please enter your street name or number")}</label>}
                  {cf.area !== "hidden" && (cf.city === "hidden" || cityVal.trim() !== "") && <label><span className={label}>Area, colony or mohalla{cf.area === "optional" ? " (optional)" : ""}</span><AreaInput items={areas} value={areaTxt} onChange={setAreaTxt} required={cf.area === "required"} placeholder="e.g. Gulshan-e-Iqbal Block 13" className={`${field} ${miss.area ? "!border-red-400" : ""}`} invalid={miss.area}
                    onBlurExtra={(e) => { if (cf.area === "required") need("area", !e.target.value.trim()); }} onInvalid={() => need("area", true)} />{areas.length > 0 && <span className="mt-1 block text-[0.65rem] text-muted">Start typing to find your area, or write your own. Suggestions from OpenStreetMap contributors.</span>}{bad("area", "Please enter your area, colony or mohalla")}</label>}
                </div>}
                {cf.extra !== "hidden" && <label className="sm:col-span-2"><span className={label}>Additional address info{cf.extra === "required" ? "" : " (optional)"}</span><input value={extra} onChange={(e) => setExtra(latinOnly(e.target.value))} onBeforeInput={noNonLatin} required={cf.extra === "required"} placeholder="e.g. near Jamia Masjid, 2nd floor" autoComplete="off" className={`${field} ${miss.extra ? "!border-red-400" : ""}`} {...watch("extra", cf.extra === "required")} />{bad("extra", "Please enter the additional address info")}</label>}
                <div className="sm:col-span-2 border-l-2 border-accent bg-card/40 px-4 py-3" aria-live="polite">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">Your full address (filled in automatically)</p>
                  <p className={`mt-1 text-sm leading-relaxed ${addr ? "text-fg" : "text-muted"}`}>{addr || "It builds itself as you fill in the boxes above."}</p>
                  <input type="hidden" name="line1" value={addr} />
                </div>
              </>
              </fieldset>}
              {cf.postalCode !== "hidden" && <label><span className={label}>Postal code{cf.postalCode === "optional" ? " (optional)" : ""}</span><input name="postalCode" required={cf.postalCode === "required"} autoComplete="postal-code" className={field} /></label>}
            </div>
            {ready && user && <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />Save this address to my account</label>}
            <div className="mt-4"><GiftOptions /></div>
            {cf.note !== "hidden" && <div className="mt-3 flex flex-wrap gap-2" aria-label="Delivery note shortcuts">
              {["Call before delivery", "Leave with a neighbour", "Deliver after 5 pm"].map((c) => <button key={c} type="button" onClick={() => setExtras({ note: extras.note.includes(c) ? extras.note : `${extras.note ? extras.note + ". " : ""}${c}` })} className="border border-line px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent">+ {c}</button>)}
            </div>}
          </section>

          <section>
            <h2 className="eyebrow mb-5">2 · Payment</h2>
            <div className="space-y-3">
              {(methods.length ? methods : [{ id: "COD", label: "Cash on delivery", description: "Pay the courier when your order arrives.", instructions: "", enabled: true } as PayMethod]).map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-start gap-4 border p-4 ${payId === m.id ? "border-accent bg-accent/5" : "border-line"}`}>
                  <input type="radio" name="pay" checked={payId === m.id} onChange={() => setPay(m.id)} className="mt-1 accent-[rgb(var(--accent))]" />
                  <span><span className="block text-sm font-semibold">{m.label}</span>{m.description && <span className="text-sm text-muted">{m.description}</span>}{payId === m.id && m.id !== "COD" && m.instructions && <span className="mt-2 block whitespace-pre-line border-l-2 border-accent pl-3 text-sm">{m.instructions}</span>}</span>
                </label>
              ))}
            </div>
          </section>

          {(error || priceError) && <p ref={errRef} tabIndex={-1} role="alert" className="border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error || priceError}</p>}
          <button disabled={busy || !priced} className="btn btn-primary w-full disabled:opacity-50 lg:hidden">{busy ? "Placing order…" : `Place order · ${priced ? pkr(priced.grandTotal) : ""}`}</button>
        </form>

        <aside className="h-fit border border-line bg-card p-6 lg:sticky lg:top-24">
          <details open className="group [&::-webkit-details-marker]:hidden lg:[&>summary]:pointer-events-none" id="order-summary">
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <h2 className="eyebrow">Order summary ({lines.reduce((n, l) => n + l.quantity, 0)})</h2>
              <span className="text-sm font-semibold lg:hidden">{priced ? pkr(priced.grandTotal) : ""}<span className="ml-2 text-muted transition group-open:rotate-180 inline-block">⌄</span></span>
            </summary>
            <ul className="mt-5 divide-y divide-line">
              {lines.map((l) => (
                <li key={`${l.productId}:${l.variantId}`} className="flex gap-4 py-4 text-sm">
                  {l.image && <img src={l.image} alt="" width={56} height={70} className="h-[70px] w-14 border border-line object-cover" />}
                  <div className="flex-1">
                    <p className="leading-snug">{l.title}</p>
                    <div className="mt-2 inline-flex items-center border border-line text-sm" role="group" aria-label={`Quantity of ${l.title}`}>
                      <button type="button" disabled={l.quantity <= 1} onClick={() => changeQty(l, l.quantity - 1)} aria-label="Decrease quantity" className="px-3 py-1 transition hover:text-accent disabled:opacity-40 disabled:hover:text-inherit">−</button>
                      <span className="w-8 text-center text-xs" aria-live="polite">{l.quantity}</span>
                      <button type="button" disabled={l.quantity >= 99} onClick={() => changeQty(l, l.quantity + 1)} aria-label="Increase quantity" className="px-3 py-1 transition hover:text-accent disabled:opacity-40 disabled:hover:text-inherit">+</button>
                    </div>
                    {!buyNowMode && <button type="button" onClick={() => removeLine(l)} aria-label={`Remove ${l.title} from this order`} className="mt-2 text-xs text-muted underline underline-offset-2 transition hover:text-accent">Remove</button>}
                  </div>
                  <p>{pkr(l.price * l.quantity)}</p>
                </li>
              ))}
            </ul>
          </details>
          <div className="mt-4 border-t border-line pt-4"><PromoField priced={priced} /></div>
          <div className="mt-4"><DispatchNote compact /></div>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{priced ? pkr(priced.subtotal) : "…"}</dd></div>
            {priced && priced.discount > 0 && <div className="flex justify-between text-accent"><dt>Discount ({priced.coupon?.code})</dt><dd>−{pkr(priced.discount)}</dd></div>}
            {priced && priced.giftWrapFee > 0 && <div className="flex justify-between"><dt className="text-muted">Gift wrap</dt><dd>{pkr(priced.giftWrapFee)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{priced ? (priced.shippingFee === 0 ? "Free" : pkr(priced.shippingFee)) : "…"}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{priced ? pkr(priced.grandTotal) : "…"}</dd></div>
          </dl>
          {priced && priced.freeShippingRemaining > 0 && <p className="mt-3 text-xs text-accent">Add {pkr(priced.freeShippingRemaining)} more for free delivery.</p>}
          <button form="checkout-form" disabled={busy || !priced} className="btn btn-primary mt-6 hidden w-full disabled:opacity-50 lg:inline-flex">{busy ? "Placing order…" : "Place order"}</button>
          <p className="mt-4 text-center text-xs text-muted">By placing your order you agree to pay on delivery.</p>
        </aside>
      </div>
    </>
  );
}
