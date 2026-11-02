"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useSession } from "./SessionProvider";
import { MascotFigure } from "./Mascot";

function Inner({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // only allow same-site relative redirects
  const next = (() => { const n = params.get("next") ?? "/account"; return n.startsWith("/") && !n.startsWith("//") ? n : "/account"; })();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    try {
      const body = mode === "login"
        ? { email: f.get("email"), password: f.get("password") }
        : { email: f.get("email"), password: f.get("password"), firstName: f.get("firstName"), lastName: f.get("lastName"), phone: f.get("phone") || undefined };
      const res = await fetch(`/api/session/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Something went wrong");
      await refresh();
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full border border-line bg-card px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent";
  const label = "mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted";
  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-8 text-center">
        <MascotFigure mood="wave" size={80} className="mx-auto mb-3 text-fg" />
        <p className="eyebrow">{mode === "login" ? "Welcome back" : "Join us"}</p>
        <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">{mode === "login" ? "Sign in" : "Create account"}</h1>
      </div>
      <form onSubmit={submit} className="space-y-4 border border-line bg-card p-6">
        {mode === "register" && (
          <div className="grid grid-cols-2 gap-4">
            <label><span className={label}>First name</span><input name="firstName" required autoComplete="given-name" className={field} /></label>
            <label><span className={label}>Last name</span><input name="lastName" required autoComplete="family-name" className={field} /></label>
          </div>
        )}
        <label className="block"><span className={label}>Email</span><input name="email" type="email" required autoComplete="email" className={field} /></label>
        {mode === "register" && <label className="block"><span className={label}>Phone (optional)</span><input name="phone" type="tel" autoComplete="tel" className={field} /></label>}
        <label className="block"><span className={label}>Password{mode === "register" && " (8+ characters)"}</span>
          <input name="password" type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} className={field} />
        </label>
        {error && <p role="alert" className="border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="btn btn-primary w-full disabled:opacity-50">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? <>New here? <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-accent hover:underline">Create an account</Link></> : <>Already registered? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-accent hover:underline">Sign in</Link></>}
      </p>
    </div>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  return <Suspense><Inner mode={mode} /></Suspense>;
}
