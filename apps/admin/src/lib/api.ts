const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// sessionStorage: token dies with the tab. Move to an httpOnly cookie before exposing this panel publicly.
export const getToken = () => {
  try { return sessionStorage.getItem("admin_token"); } catch { return null; }
};
export const setToken = (t: string | null) => {
  try { t ? sessionStorage.setItem("admin_token", t) : sessionStorage.removeItem("admin_token"); } catch {}
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
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
