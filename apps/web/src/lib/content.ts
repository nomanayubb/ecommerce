import { api } from "./api";

export type Nutrition = { kcal: number; protein: number; carbs: number; fat: number };
export interface RecipeProduct { id: string; title: string; slug: string; selling_price: string; marked_price: string; stock_quantity: number; image: string | null; moq: number; has_variants: boolean }
export interface Ingredient { name: string; qty: number | null; unit: string; note: string; productSlug: string | null; pantry: boolean; nutrition: Nutrition | null; product: RecipeProduct | null }
export interface RecipeCardData {
  id: string; slug: string; title: string; summary: string; image_url: string; video_url: string; difficulty: "EASY" | "MEDIUM" | "HARD";
  prep_minutes: number; cook_minutes: number; servings: number; seasons: string[]; tags: string[]; featured: boolean; matchPct?: number | null; missing?: string[];
}
export interface Recipe extends RecipeCardData {
  tools: string[]; ingredients: Ingredient[]; steps: { text: string; timerMinutes: number | null }[];
  toolProducts: RecipeProduct[]; related: RecipeCardData[];
}
export interface PostCard { id: string; slug: string; title: string; excerpt: string; cover_url: string; author_name: string; tags: string[]; featured: boolean; published_at: string | null }
export interface Post extends PostCard { body: string; author_bio: string; related: { slug: string; title: string; cover_url: string; published_at: string | null }[] }
export interface Bundle {
  id: string; slug: string; title: string; description: string; image_url: string; curator: string; total: number;
  items: { slug: string; qty: number; product: RecipeProduct }[];
}

export const getRecipes = (qs = "") => api<{ items: RecipeCardData[]; total: number; page: number; pageSize: number }>(`/recipes${qs ? `?${qs}` : ""}`, { revalidate: 30 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 12 }));
export const getRecipe = (slug: string) => api<Recipe>(`/recipes/${slug}`, { revalidate: 30 }).catch(() => null);
export const getPosts = (qs = "") => api<{ items: PostCard[]; total: number; page: number; pageSize: number }>(`/posts${qs ? `?${qs}` : ""}`, { revalidate: 30 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 9 }));
export const getPost = (slug: string) => api<Post>(`/posts/${slug}`, { revalidate: 30 }).catch(() => null);
export const getBundles = () => api<{ items: Bundle[] }>("/bundles", { revalidate: 30 }).then((r) => r.items).catch(() => [] as Bundle[]);
export const getBundle = (slug: string) => api<Bundle>(`/bundles/${slug}`, { revalidate: 30 }).catch(() => null);

/** 0.5 -> "½", 1.25 -> "1¼", 2 -> "2", 2.333 -> "2.3". */
export function fmtQty(n: number): string {
  const frac: [number, string][] = [[0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"]];
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  if (rest < 0.04) return String(whole);
  const hit = frac.find(([v]) => Math.abs(rest - v) < 0.04);
  if (hit) return `${whole || ""}${hit[1]}`;
  return String(Math.round(n * 10) / 10);
}

export const totalMinutes = (r: Pick<RecipeCardData, "prep_minutes" | "cook_minutes">) => r.prep_minutes + r.cook_minutes;
export const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

/** Northern-hemisphere style season for "in season now" (stores can still tag recipes with any word). */
export function currentSeason(d = new Date()): string {
  const m = d.getMonth() + 1;
  return m === 12 || m <= 2 ? "winter" : m <= 5 ? "spring" : m <= 9 ? "summer" : "autumn";
}

/** Blog text -> blocks. Blank line = paragraph, "# " heading, "## " subheading, "- " list, "![alt](url)" photo. */
export type Block = { t: "h2" | "h3" | "p"; text: string } | { t: "ul"; items: string[] } | { t: "img"; alt: string; src: string };
export function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = chunk.split("\n").map((l) => l.trimEnd()).filter(Boolean);
    if (!lines.length) continue;
    const img = lines.length === 1 && lines[0].match(/^!\[(.*?)\]\((\/[^\s)]*|https?:\/\/[^\s)]+)\)$/);
    if (img) blocks.push({ t: "img", alt: img[1], src: img[2] });
    else if (lines.every((l) => l.startsWith("- "))) blocks.push({ t: "ul", items: lines.map((l) => l.slice(2)) });
    else if (lines[0].startsWith("## ")) { blocks.push({ t: "h3", text: lines[0].slice(3) }); if (lines.length > 1) blocks.push({ t: "p", text: lines.slice(1).join(" ") }); }
    else if (lines[0].startsWith("# ")) { blocks.push({ t: "h2", text: lines[0].slice(2) }); if (lines.length > 1) blocks.push({ t: "p", text: lines.slice(1).join(" ") }); }
    else blocks.push({ t: "p", text: lines.join(" ") });
  }
  return blocks;
}
