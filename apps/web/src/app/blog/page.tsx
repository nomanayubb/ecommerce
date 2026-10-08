import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getPosts } from "@/lib/content";

export const metadata: Metadata = { title: "Journal", description: "Articles, guides and news." };
type SP = Record<string, string | undefined>;
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

export default async function Blog({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.tag) qs.set("tag", sp.tag);
  if (sp.page) qs.set("page", sp.page);
  const data = await getPosts(qs.toString());
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const [first, ...rest] = data.items;
  const href = (page: number) => `/blog?${new URLSearchParams({ ...(sp.tag ? { tag: sp.tag } : {}), page: String(page) })}`;
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Journal" }]} />
      <p className="eyebrow">Journal</p>
      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">{sp.tag ? `#${sp.tag}` : "From the journal"}</h1>
      {!first ? <p className="mt-12 border border-dashed border-line py-20 text-center text-muted">No articles yet.</p> : (
        <>
          <Link href={`/blog/${first.slug}`} className="lift group mt-10 grid overflow-hidden border border-line bg-card md:grid-cols-2">
            <img src={first.cover_url || `/ph/${first.slug}`} alt="" width={900} height={600} fetchPriority="high" className="aspect-[3/2] h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
            <div className="flex flex-col justify-center p-8">
              <p className="eyebrow !text-[0.65rem]">{first.featured ? "Featured" : "Latest"} · {date(first.published_at)}</p>
              <h2 className="mt-3 text-2xl font-semibold leading-snug">{first.title}</h2>
              <p className="mt-3 text-muted">{first.excerpt}</p>
              <span className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Read →</span>
            </div>
          </Link>
          {rest.length > 0 && (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => (
                <li key={p.id}>
                  <Link href={`/blog/${p.slug}`} className="lift group block h-full border border-line bg-card">
                    <img src={p.cover_url || `/ph/${p.slug}`} alt="" loading="lazy" width={600} height={400} className="aspect-[3/2] w-full object-cover" />
                    <div className="p-5"><p className="text-xs text-muted">{date(p.published_at)}</p><h2 className="mt-2 font-semibold leading-snug">{p.title}</h2><p className="mt-2 line-clamp-2 text-sm text-muted">{p.excerpt}</p></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-6 text-xs font-semibold uppercase tracking-[0.2em]">
              {data.page > 1 ? <Link href={href(data.page - 1)} className="hover:text-accent">← Newer</Link> : <span className="text-muted/40">← Newer</span>}
              <span className="text-muted">Page {data.page} of {pages}</span>
              {data.page < pages ? <Link href={href(data.page + 1)} className="hover:text-accent">Older →</Link> : <span className="text-muted/40">Older →</span>}
            </nav>
          )}
        </>
      )}
    </>
  );
}
