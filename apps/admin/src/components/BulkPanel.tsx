"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type PriceAct = "" | "inc" | "dec" | "set" | "discount";
type StockAct = "" | "set" | "inc" | "dec";
type Flag = "" | "show" | "hide" | "theme";
const input = "rounded border border-line bg-card px-3 py-2 text-sm";
const label = "block text-xs font-medium text-muted";
const tags = (v: string) => v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);

/** Change many products at once: price up or down by a number or percent, stock, status, tags and buy buttons. */
export function BulkPanel({ endpoint, selected, total, scopeLabel, onDone }: { endpoint: string; selected: string[]; total: number; scopeLabel: string; onDone: () => void }) {
  const [priceAct, setPriceAct] = useState<PriceAct>("");
  const [unit, setUnit] = useState<"percent" | "amount">("amount");
  const [priceVal, setPriceVal] = useState("");
  const [alsoMarked, setAlsoMarked] = useState(true);
  const [stockAct, setStockAct] = useState<StockAct>("");
  const [stockVal, setStockVal] = useState("");
  const [status, setStatus] = useState("");
  const [addTags, setAddTags] = useState("");
  const [removeTags, setRemoveTags] = useState("");
  const [cart, setCart] = useState<Flag>("");
  const [buy, setBuy] = useState<Flag>("");
  const [addr, setAddr] = useState<Flag>("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const count = selected.length || total;
  async function apply() {
    const body: Record<string, unknown> = {};
    if (selected.length) body.productIds = selected;
    if (priceAct) {
      const n = Number(priceVal);
      if (!priceVal || !Number.isFinite(n) || n < 0) return setMsg({ ok: false, text: "Type the price number first (0 or more)" });
      if (priceAct === "inc") body.price = { mode: unit, value: n, alsoMarked };
      else if (priceAct === "dec") body.price = { mode: unit, value: -n, alsoMarked };
      else body.price = { mode: priceAct === "set" ? "set" : "discount", value: n, alsoMarked };
    }
    if (stockAct) {
      const n = Math.round(Number(stockVal));
      if (stockVal === "" || !Number.isFinite(n) || n < 0) return setMsg({ ok: false, text: "Type the stock number first" });
      body.stock = { mode: stockAct === "set" ? "set" : "add", value: stockAct === "dec" ? -n : n };
    }
    if (status) body.status = status;
    if (tags(addTags).length) body.addTags = tags(addTags);
    if (tags(removeTags).length) body.removeTags = tags(removeTags);
    const fv = (f: Flag) => (f === "theme" ? null : f === "show");
    if (cart) body.showAddToCart = fv(cart);
    if (buy) body.showBuyNow = fv(buy);
    if (addr) body.showAddress = fv(addr);
    if (Object.keys(body).filter((k) => k !== "productIds").length === 0) return setMsg({ ok: false, text: "Choose at least one change" });
    if (!confirm(`Apply these changes to ${count} product${count === 1 ? "" : "s"} (${selected.length ? "selected" : scopeLabel})?`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ changed: number }>(endpoint, { method: "POST", body: JSON.stringify(body) });
      setMsg({ ok: true, text: `Done. ${r.changed} product${r.changed === 1 ? "" : "s"} updated.` });
      setPriceAct(""); setPriceVal(""); setStockAct(""); setStockVal(""); setStatus(""); setAddTags(""); setRemoveTags(""); setCart(""); setBuy(""); setAddr("");
      onDone();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not apply the changes" }); }
    finally { setBusy(false); }
  }

  const flag = (v: Flag, set: (f: Flag) => void) => (
    <select className={`mt-1 w-full ${input}`} value={v} onChange={(e) => set(e.target.value as Flag)}><option value="">No change</option><option value="show">Show</option><option value="hide">Hide</option><option value="theme">Follow the theme setting</option></select>
  );
  return (
    <details className="mb-6 rounded border border-line bg-card" open>
      <summary className="cursor-pointer px-5 py-3 text-sm font-semibold uppercase tracking-widest">Bulk edit · {selected.length ? `${selected.length} selected` : `all ${total} ${scopeLabel}`}</summary>
      <div className="space-y-4 border-t border-line p-5">
        <p className="text-xs text-muted">Tick products in the list to change only those. With nothing ticked, the changes apply to every product here. Only the boxes you fill in are changed.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className={label}>Price
              <select className={`mt-1 w-full ${input}`} value={priceAct} onChange={(e) => setPriceAct(e.target.value as PriceAct)}>
                <option value="">No change</option><option value="inc">Increase by</option><option value="dec">Decrease by</option><option value="set">Set to exactly</option><option value="discount">Selling price = original price minus %</option>
              </select>
            </label>
            {priceAct && (
              <div className="flex gap-2">
                <input type="number" min={0} className={`w-full ${input}`} placeholder={priceAct === "discount" ? "Percent off, e.g. 20" : "Number, e.g. 500"} value={priceVal} onChange={(e) => setPriceVal(e.target.value)} />
                {(priceAct === "inc" || priceAct === "dec") && <select className={input} value={unit} onChange={(e) => setUnit(e.target.value as "percent" | "amount")}><option value="amount">Rs</option><option value="percent">%</option></select>}
              </div>
            )}
            {(priceAct === "inc" || priceAct === "dec") && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={alsoMarked} onChange={(e) => setAlsoMarked(e.target.checked)} />Change the crossed-out original price the same way (keeps the sale as it is)</label>}
            {priceAct === "inc" || priceAct === "dec" ? <p className="text-xs text-muted">Option prices (sizes, colours) change by the same amount.</p> : null}
          </div>
          <div className="space-y-2">
            <label className={label}>Stock
              <select className={`mt-1 w-full ${input}`} value={stockAct} onChange={(e) => setStockAct(e.target.value as StockAct)}>
                <option value="">No change</option><option value="set">Set to exactly</option><option value="inc">Increase by</option><option value="dec">Decrease by</option>
              </select>
            </label>
            {stockAct && <input type="number" min={0} className={`w-full ${input}`} placeholder="Number of items" value={stockVal} onChange={(e) => setStockVal(e.target.value)} />}
          </div>
          <label className={label}>Status
            <select className={`mt-1 w-full ${input}`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">No change</option><option value="PUBLISHED">Published (visible)</option><option value="DRAFT">Draft (hidden)</option><option value="ARCHIVED">Archived</option></select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Add tags<input className={`mt-1 w-full ${input}`} placeholder="sale, gift" value={addTags} onChange={(e) => setAddTags(e.target.value)} /></label>
            <label className={label}>Remove tags<input className={`mt-1 w-full ${input}`} placeholder="old, clearance" value={removeTags} onChange={(e) => setRemoveTags(e.target.value)} /></label>
          </div>
          <label className={label}>Add to bag button{flag(cart, setCart)}</label>
          <label className={label}>Buy now button{flag(buy, setBuy)}</label>
          <label className={label}>Delivery address check{flag(addr, setAddr)}</label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" disabled={busy} onClick={apply} className="rounded bg-brand px-5 py-2 text-sm font-medium text-onbrand disabled:opacity-50">{busy ? "Applying..." : `Apply to ${count} product${count === 1 ? "" : "s"}`}</button>
          {msg && <span className={`text-sm ${msg.ok ? "text-accent" : "text-red-500"}`}>{msg.text}</span>}
        </div>
      </div>
    </details>
  );
}
