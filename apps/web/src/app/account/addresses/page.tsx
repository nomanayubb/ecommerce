"use client";

import { useCallback, useEffect, useState } from "react";
import { send } from "@/lib/client";

interface Address { id: string; label: string | null; name: string; phone: string; line1: string; city: string; province: string | null; postal_code: string | null; is_default: boolean }

const field = "w-full border border-line bg-card px-4 py-3 text-sm outline-none transition focus:border-accent";
const label = "mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted";

export default function Addresses() {
  const [list, setList] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => send<Address[]>("GET", "account/addresses").then(setList).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = { label: String(f.get("label") || "") || undefined, name: f.get("name"), phone: f.get("phone"), line1: f.get("line1"), city: f.get("city"), postalCode: String(f.get("postalCode") || "") || undefined, isDefault: f.get("isDefault") === "on" };
    setError("");
    try {
      if (editing && editing !== "new") await send("PUT", `account/addresses/${editing.id}`, body);
      else await send("POST", "account/addresses", body);
      setEditing(null); load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save address"); }
  }

  const a = editing && editing !== "new" ? editing : null;
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div><p className="eyebrow">Delivery</p><h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Address book</h1></div>
        {!editing && <button onClick={() => setEditing("new")} className="btn btn-primary !py-2.5">Add address</button>}
      </div>
      {error && <p role="alert" className="mb-4 border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

      {editing && (
        <form onSubmit={save} className="mb-8 grid gap-4 border border-line bg-card p-6 sm:grid-cols-2" key={a?.id ?? "new"}>
          <label><span className={label}>Label (Home, Office…)</span><input name="label" defaultValue={a?.label ?? ""} maxLength={40} className={field} /></label>
          <label><span className={label}>Full name</span><input name="name" required defaultValue={a?.name ?? ""} className={field} /></label>
          <label><span className={label}>Phone</span><input name="phone" required type="tel" minLength={7} defaultValue={a?.phone ?? ""} className={field} /></label>
          <label><span className={label}>City</span><input name="city" required defaultValue={a?.city ?? ""} className={field} /></label>
          <label className="sm:col-span-2"><span className={label}>Address</span><input name="line1" required defaultValue={a?.line1 ?? ""} className={field} /></label>
          <label><span className={label}>Postal code (optional)</span><input name="postalCode" defaultValue={a?.postal_code ?? ""} className={field} /></label>
          <label className="flex items-center gap-3 self-end pb-3 text-sm"><input type="checkbox" name="isDefault" defaultChecked={a?.is_default ?? false} className="h-4 w-4 accent-[rgb(var(--accent))]" /> Make this my default address</label>
          <div className="flex gap-3 sm:col-span-2"><button className="btn btn-primary !py-2.5">Save address</button><button type="button" onClick={() => setEditing(null)} className="btn btn-ghost !py-2.5">Cancel</button></div>
        </form>
      )}

      {list && list.length === 0 && !editing && <div className="border border-dashed border-line py-16 text-center text-muted">No saved addresses yet.</div>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {list?.map((x) => (
          <li key={x.id} className="border border-line bg-card p-5 text-sm">
            <div className="mb-2 flex items-center justify-between"><p className="eyebrow">{x.label || "Address"}</p>{x.is_default && <span className="border border-accent px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-accent">Default</span>}</div>
            <p className="text-muted">{x.name}<br />{x.line1}<br />{x.city}{x.postal_code ? ` ${x.postal_code}` : ""}<br />{x.phone}</p>
            <div className="mt-4 flex gap-4 text-xs uppercase tracking-[0.18em]">
              <button onClick={() => setEditing(x)} className="transition hover:text-accent">Edit</button>
              <button onClick={async () => { if (confirm("Delete this address?")) { await send("DELETE", `account/addresses/${x.id}`).catch((e) => setError(e.message)); load(); } }} className="text-muted transition hover:text-red-400">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
