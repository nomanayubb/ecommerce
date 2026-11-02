/** Browser helpers: talk to the API through the Next proxy so the httpOnly login cookie is attached. */
export async function send<T = unknown>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/proxy/${path}`, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { issues?: { message?: string }[]; error?: string };
    throw new Error(d.issues?.[0]?.message ?? d.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}
