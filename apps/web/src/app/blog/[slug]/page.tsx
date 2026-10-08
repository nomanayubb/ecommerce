import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getPost, parseBody } from "@/lib/content";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPost((await params).slug);
  return p ? { title: p.title, description: p.excerpt || p.title, openGraph: { title: p.title, description: p.excerpt, images: p.cover_url ? [p.cover_url] : undefined, type: "article" } } : { title: "Article not found" };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPost((await params).slug);
  if (!p) notFound();
  const blocks = parseBody(p.body);
  const when = p.published_at ? new Date(p.published_at) : null;
  const jsonLd = { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.excerpt || undefined, image: p.cover_url ? [p.cover_url] : undefined, datePublished: p.published_at ?? undefined, author: p.author_name ? { "@type": "Person", name: p.author_name } : undefined };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Journal", href: "/blog" }, { name: p.title }]} />
      <article className="mx-auto max-w-3xl">
        <header>
          <p className="eyebrow">{when ? when.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Journal"}{p.author_name ? ` · ${p.author_name}` : ""}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-wide">{p.title}</h1>
          {p.excerpt && <p className="mt-4 text-lg text-muted">{p.excerpt}</p>}
        </header>
        {p.cover_url && <img src={p.cover_url} alt="" width={1200} height={700} fetchPriority="high" className="my-10 aspect-[16/9] w-full border border-line object-cover" />}
        <div className="space-y-5 leading-[1.8]">
          {blocks.map((b, i) =>
            b.t === "h2" ? <h2 key={i} className="pt-6 text-2xl font-semibold">{b.text}</h2>
            : b.t === "h3" ? <h3 key={i} className="pt-4 text-xl font-semibold">{b.text}</h3>
            : b.t === "ul" ? <ul key={i} className="list-disc space-y-1 pl-6 marker:text-accent">{b.items.map((x, n) => <li key={n}>{x}</li>)}</ul>
            : b.t === "img" ? <figure key={i}><img src={b.src} alt={b.alt} loading="lazy" className="w-full border border-line" />{b.alt && <figcaption className="mt-2 text-xs text-muted">{b.alt}</figcaption>}</figure>
            : <p key={i} className="text-fg/90">{b.text}</p>
          )}
        </div>
        {p.tags.length > 0 && <ul className="mt-10 flex flex-wrap gap-2">{p.tags.map((t) => <li key={t}><Link href={`/blog?tag=${t}`} className="border border-line px-3 py-1 text-xs uppercase tracking-widest text-muted transition hover:border-accent hover:text-accent">{t}</Link></li>)}</ul>}
        {(p.author_name || p.author_bio) && (
          <aside className="mt-12 flex gap-5 border border-line bg-card p-6" aria-label="About the author">
            <span className="grid h-14 w-14 shrink-0 place-items-center border border-accent text-xl font-semibold text-accent" aria-hidden>{(p.author_name || "A").slice(0, 1)}</span>
            <div><p className="eyebrow !text-[0.65rem]">Written by</p><p className="mt-1 font-semibold">{p.author_name}</p>{p.author_bio && <p className="mt-2 text-sm text-muted">{p.author_bio}</p>}</div>
          </aside>
        )}
      </article>
      {p.related.length > 0 && (
        <section className="mx-auto mt-20 max-w-3xl border-t border-line pt-10">
          <p className="eyebrow">Keep reading</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">{p.related.map((r) => <li key={r.slug}><Link href={`/blog/${r.slug}`} className="lift block border border-line bg-card"><img src={r.cover_url || `/ph/${r.slug}`} alt="" loading="lazy" width={400} height={260} className="aspect-[3/2] w-full object-cover" /><span className="block p-4 text-sm font-medium leading-snug">{r.title}</span></Link></li>)}</ul>
        </section>
      )}
    </>
  );
}
