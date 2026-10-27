const ENV_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// One admin for several shops (main shop, electronics, ...): the list comes from /stores.json (public folder, edited by scripts/new-store.ts), the chosen shop is kept in this browser,
// and every request goes to that shop's API. The login token works on all of them (same users, same secret).
export interface StoreInfo { slug: string; name: string; api: string }
export const getStores = (): StoreInfo[] => { try { return JSON.parse(localStorage.getItem("admin_stores") ?? "[]"); } catch { return []; } };
export const setStores = (l: StoreInfo[]) => { try { localStorage.setItem("admin_stores", JSON.stringify(l)); } catch {} };
export const getStore = (): StoreInfo | null => { try { const s = localStorage.getItem("admin_store"); return getStores().find((x) => x.slug === s) ?? null; } catch { return null; } };
export const chooseStore = (slug: string) => { try { localStorage.setItem("admin_store", slug); } catch {} };
/** "this" = a settings change is saved only in the chosen shop, "all" = the same change is also saved in every other shop (each keeps its own name, menu links and social links). */
export const getScope = (): "this" | "all" => { try { return localStorage.getItem("admin_scope") === "all" ? "all" : "this"; } catch { return "this"; } };
export const setScope = (v: "this" | "all") => { try { localStorage.setItem("admin_scope", v); } catch {} };
const SCOPED = ["/admin/settings", "/admin/store-settings", "/admin/footer-settings"];

export const apiBase = () => (typeof window !== "undefined" && getStore()?.api) || ENV_BASE;

// sessionStorage: token dies with the tab. Move to an httpOnly cookie before exposing this panel publicly.
export const getToken = () => {
  try { return sessionStorage.getItem("admin_token"); } catch { return null; }
};
export const setToken = (t: string | null) => {
  try { t ? sessionStorage.setItem("admin_token", t) : sessionStorage.removeItem("admin_token"); } catch {}
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined") window.location.href = "/login";
  }
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  if (init.method === "PUT" && SCOPED.includes(path) && getScope() === "all" && typeof init.body === "string") {
    const failed: string[] = [];
    for (const st of getStores().filter((x) => x.slug !== getStore()?.slug)) {
      try {
        let payload = JSON.parse(init.body);
        if (path === "/admin/settings") {     // each shop keeps its own name, menu links and social links
          const cur = (await (await fetch(`${st.api}/settings`)).json()).branding ?? {};
          payload = { ...payload, name: cur.name ?? payload.name, navLinks: cur.navLinks ?? [], social: cur.social ?? payload.social };
        }
        const r = await fetch(`${st.api}${path}`, { method: "PUT", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
        if (!r.ok) failed.push(st.name);
      } catch { failed.push(st.name); }
    }
    if (failed.length) throw new Error(`Saved here, but not in: ${failed.join(", ")}`);
  }
  return body as T;
}

export const pkr = (n: number | string) => `Rs. ${Number(n).toLocaleString("en-PK")}`;

export interface AdminProduct {
  id: string; title: string; slug: string; sku: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  marked_price: string; selling_price: string; stock_quantity: number; images: string[];
}
export interface AdminOrder {
  id: string; order_number: number; grand_total: string; order_status: string; payment_status: string;
  payment_method: string; created_at: string;
}
export interface CategoryNode { id: string; name: string; slug: string; children: CategoryNode[] }
