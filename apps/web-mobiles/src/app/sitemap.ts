import type { MetadataRoute } from "next";
import { api, type CategoryNode, type ProductSummary } from "@/lib/api";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const revalidate = 3600;

const flat = (n: CategoryNode[]): CategoryNode[] => n.flatMap((c) => [c, ...flat(c.children)]);

/** Every public page search engines should know about: shop, categories, products, recipes, articles, sets. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const get = <T,>(p: string, d: T) => api<T>(p, { revalidate: 3600 }).catch(() => d);
  const [tree, products, recipes, posts, bundles] = await Promise.all([
    get<CategoryNode[]>("/categories/tree", []),
    (async () => { const all: ProductSummary[] = []; for (let pg = 1; pg <= 40; pg++) { const r = await get<{ items: ProductSummary[]; total: number }>(`/products?pageSize=100&page=${pg}`, { items: [], total: 0 }); all.push(...r.items); if (all.length >= r.total || !r.items.length) break; } return { items: all }; })(),
    get<{ items: { slug: string }[] }>("/recipes?pageSize=48", { items: [] }),
    get<{ items: { slug: string; published_at: string | null }[] }>("/posts?pageSize=30", { items: [] }),
    get<{ items: { slug: string }[] }>("/bundles", { items: [] }),
  ]);
  const now = new Date();
  const url = (path: string, priority: number, lastModified: Date = now) => ({ url: `${SITE}${path}`, lastModified, priority });
  return [
    url("/", 1), url("/products", 0.9), url("/collections", 0.8), url("/recipes", 0.7), url("/blog", 0.6), url("/bundles", 0.6), url("/guides", 0.5), url("/quiz", 0.4),
    ...flat(tree).map((c) => url(`/collections/${c.slug}`, 0.7)),
    ...products.items.map((p) => url(`/products/${p.slug}`, 0.8)),
    ...recipes.items.map((r) => url(`/recipes/${r.slug}`, 0.6)),
    ...posts.items.map((p) => url(`/blog/${p.slug}`, 0.5, p.published_at ? new Date(p.published_at) : now)),
    ...bundles.items.map((b) => url(`/bundles/${b.slug}`, 0.5)),
  ];
}
