"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Coupon {
  code: string; description: string; kind: "PERCENT" | "FIXED" | "FREE_SHIPPING"; value: string; min_subtotal: string;
  max_discount: string | null; max_uses: number | null; used_count: number; starts_at: string | null; ends_at: string | null; active: boolean;
}

const input = "rounded border border-line bg-card px-3 py-2 text-sm w-full";
const label = "block text-xs font-medium text-muted";
const kinds = { PERCENT: "Percent off", FIXED: "Fixed amount off", FREE_SHIPPING: "Free delivery" } as const;
const fmt = (c: Coupon) => (c.kind === "PERCENT" ? `${Number(c.value)}%` : c.kind === "FIXED" ? `Rs. ${Number(c.value).toLocaleString()}` : "Free delivery");
const toIso = (v: FormDataEntryValue | null) => (v ? new Date(String(v)).toISOString() : null);

export default function Coupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [kind, setKind] = useState<Coupon["kind"]>("PERCENT");
  const load = useCallback(() => api<Coupon[]>("/admin/coupons").then(setRows).catch((e) => setMsg({ ok: false, text: e.message })), []);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (f.get(k) ? Number(f.get(k)) : undefined);
    try {
      await api("/admin/coupons", { method: "POST", body: JSON.stringify({
        code: f.get("code"), description: f.get("description") || "", kind, value: kind === "FREE_SHIPPING" ? 0 : num("value") ?? 0,
        minSubtotal: num("minSubtotal") ?? 0, maxDiscount: kind === "PERCENT" ? num("maxDiscount") ?? null : null, maxUses: num("maxUses") ?? null,
        startsAt: toIso(f.get("startsAt")), endsAt: toIso(f.get("endsAt")), active: true,
      }) });
      (e.target as HTMLFormElement).reset();
      setMsg({ ok: true, text: "Coupon created." });
      load();
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not create coupon" }); }
  }
  async function toggle(c: Coupon) {
    try {
      await api(`/admin/coupons/${c.code}`, { method: "PUT", body: JSON.stringify({
        description: c.description, kind: c.kind, value: Number(c.value), minSubtotal: Number(c.min_subtotal),
        maxDiscount: c.max_discount == null ? null : Number(c.max_discount), maxUses: c.max_uses, startsAt: c.starts_at, endsAt: c.ends_at, active: !c.active,
      }) });
      load();
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Update failed" }); }
  }
  async function remove(code: string) {
    if (!confirm(`Delete coupon ${code}? Past orders keep the code they used.`)) return;
    await api(`/admin/coupons/${code}`, { method: "DELETE" }).then(load).catch((e) => setMsg({ ok: false, text: e.message }));
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Coupons</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">Promo codes customers enter in the bag or at checkout. The server checks every rule again when the order is placed.</p>
      {msg && <p className={`mb-4 text-sm ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</p>}

      <form onSubmit={create} className="mb-8 grid max-w-3xl gap-3 rounded border border-line p-4 sm:grid-cols-3">
        <label className={label}>Code<input name="code" required minLength={3} maxLength={30} className={`${input} uppercase`} placeholder="WELCOME10" /></label>
        <label className={label}>Type<select value={kind} onChange={(e) => setKind(e.target.value as Coupon["kind"])} className={input}>{Object.entries(kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {kind !== "FREE_SHIPPING" && <label className={label}>{kind === "PERCENT" ? "Percent (1-100)" : "Amount (Rs.)"}<input name="value" type="number" min={1} max={kind === "PERCENT" ? 100 : undefined} required className={input} /></label>}
        <label className={label}>Minimum spend (Rs.)<input name="minSubtotal" type="number" min={0} className={input} placeholder="0" /></label>
        {kind === "PERCENT" && <label className={label}>Max discount (Rs., optional)<input name="maxDiscount" type="number" min={1} className={input} /></label>}
        <label className={label}>Total uses (optional)<input name="maxUses" type="number" min={1} className={input} /></label>
        <label className={label}>Starts (optional)<input name="startsAt" type="datetime-local" className={input} /></label>
        <label className={label}>Ends (optional)<input name="endsAt" type="datetime-local" className={input} /></label>
        <label className={`${label} sm:col-span-3`}>Note for yourself<input name="description" maxLength={200} className={input} /></label>
        <div className="sm:col-span-3"><button className="rounded bg-brand px-5 py-2 text-sm font-medium text-onbrand">Create coupon</button></div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-muted"><tr>{["Code", "Discount", "Rules", "Used", "Status", ""].map((h) => <th key={h} className="border-b border-line px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((c) => {
              const expired = c.ends_at && new Date(c.ends_at) < new Date();
              return (
                <tr key={c.code}>
                  <td className="border-b border-line px-2 py-3 font-mono font-medium">{c.code}<div className="font-sans text-xs font-normal text-muted">{c.description}</div></td>
                  <td className="border-b border-line px-2 py-3">{fmt(c)}{c.max_discount && ` (max Rs. ${Number(c.max_discount).toLocaleString()})`}</td>
                  <td className="border-b border-line px-2 py-3 text-xs text-muted">
                    {Number(c.min_subtotal) > 0 ? `Min Rs. ${Number(c.min_subtotal).toLocaleString()}` : "No minimum"}
                    {c.ends_at && <div>Ends {new Date(c.ends_at).toLocaleString()}</div>}
                  </td>
                  <td className="border-b border-line px-2 py-3">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                  <td className="border-b border-line px-2 py-3">{expired ? "Expired" : c.active ? "Active" : "Paused"}</td>
                  <td className="border-b border-line px-2 py-3 text-right">
                    <button onClick={() => toggle(c)} className="mr-3 text-xs underline">{c.active ? "Pause" : "Activate"}</button>
                    <button onClick={() => remove(c.code)} className="text-xs text-red-500 underline">Delete</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="px-2 py-8 text-center text-muted">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
