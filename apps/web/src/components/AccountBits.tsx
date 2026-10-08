"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/lib/client";
import { useCart } from "./CartProvider";
import { useSession } from "./SessionProvider";

export function SignOutButton() {
  const router = useRouter();
  const { signOut } = useSession();
  return (
    <button onClick={async () => { await signOut(); router.replace("/"); router.refresh(); }} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted transition hover:text-accent lg:px-0">
      Sign out
    </button>
  );
}

export function ProfileForm({ firstName, lastName, phone }: { firstName: string; lastName: string; phone: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const field = "w-full border border-line bg-card px-4 py-3 text-sm outline-none transition focus:border-accent";
  const label = "mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted";
  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true); setMsg(null);
        try { await send("PUT", "account/me", { firstName: f.get("firstName"), lastName: f.get("lastName"), phone: f.get("phone") }); setMsg({ ok: true, text: "Saved" }); }
        catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save" }); }
        finally { setBusy(false); }
      }}
    >
      <label><span className={label}>First name</span><input name="firstName" defaultValue={firstName} className={field} /></label>
      <label><span className={label}>Last name</span><input name="lastName" defaultValue={lastName} className={field} /></label>
      <label><span className={label}>Phone</span><input name="phone" defaultValue={phone} type="tel" className={field} /></label>
      <div className="flex items-center gap-4 sm:col-span-3">
        <button disabled={busy} className="btn btn-primary !py-2.5 disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button>
        {msg && <span role="status" className={`text-sm ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

/** One-click reorder: puts a past order's items back in the bag (the server re-prices at checkout). */
export function ReorderButton({ items }: { items: { product_id: string | null; variant_id: string | null; title: string; unit_price: string; quantity: number }[] }) {
  const { add } = useCart();
  return (
    <button
      className="btn btn-ghost !py-2.5"
      onClick={() => items.filter((i) => i.product_id).forEach((i) => add({ productId: i.product_id!, variantId: i.variant_id, title: i.title, price: Number(i.unit_price), quantity: i.quantity }))}
    >
      Reorder these items
    </button>
  );
}
