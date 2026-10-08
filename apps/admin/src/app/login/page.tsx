"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setToken } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await api<{ accessToken: string; user: { role: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
      });
      if (!["SUPER_ADMIN", "ADMIN", "WAREHOUSE"].includes(r.user.role)) throw new Error("This account is not staff");
      setToken(r.accessToken);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded border border-line bg-card px-3 py-2";
  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-xl border border-line bg-card p-6">
        <img src="/logo-full.webp" alt="Logo" className="mx-auto h-28 w-auto" />
        <h1 className="text-center text-xl font-bold">Admin sign in</h1>
        <input name="email" type="email" required placeholder="Email" autoComplete="username" className={input} />
        <input name="password" type="password" required placeholder="Password" autoComplete="current-password" className={input} />
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-brand py-2 font-medium text-onbrand disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
