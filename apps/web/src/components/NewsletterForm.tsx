"use client";

import { useState } from "react";
import { send } from "@/lib/client";

export function NewsletterForm() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  return (
    <form
      className="mt-6 max-w-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        const email = String(new FormData(e.currentTarget).get("email"));
        setState("busy");
        try { await send("POST", "newsletter", { email }); setState("done"); setMsg("You are on the list. Thank you!"); }
        catch (err) { setState("error"); setMsg(err instanceof Error ? err.message : "Could not subscribe"); }
      }}
    >
      <label htmlFor="nl-email" className="eyebrow !text-[0.65rem]">New arrivals, first</label>
      <div className="mt-2 flex">
        <input id="nl-email" name="email" type="email" required placeholder="Your email" disabled={state === "done"} className="min-w-0 flex-1 border border-line bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent" />
        <button disabled={state === "busy" || state === "done"} className="btn btn-primary !px-4 !py-2.5 disabled:opacity-50">{state === "busy" ? "…" : "Join"}</button>
      </div>
      {msg && <p role="status" className={`mt-2 text-xs ${state === "error" ? "text-red-400" : "text-accent"}`}>{msg}</p>}
    </form>
  );
}

/** "Tell me when it is back" for sold-out products. */
export function StockAlert({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  return (
    <form
      className="border border-line bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const email = String(new FormData(e.currentTarget).get("email"));
        setState("busy");
        try { await send("POST", `products/${slug}/stock-alert`, { email }); setState("done"); setMsg("We will email you as soon as it is back."); }
        catch (err) { setState("error"); setMsg(err instanceof Error ? err.message : "Could not save your request"); }
      }}
    >
      <label htmlFor="alert-email" className="eyebrow !text-[0.65rem]">Notify me when it is back</label>
      <div className="mt-2 flex">
        <input id="alert-email" name="email" type="email" required placeholder="Your email" disabled={state === "done"} className="min-w-0 flex-1 border border-line bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent" />
        <button disabled={state === "busy" || state === "done"} className="btn btn-primary !px-4 !py-2.5 disabled:opacity-50">{state === "busy" ? "…" : "Notify me"}</button>
      </div>
      {msg && <p role="status" className={`mt-2 text-xs ${state === "error" ? "text-red-400" : "text-accent"}`}>{msg}</p>}
    </form>
  );
}
