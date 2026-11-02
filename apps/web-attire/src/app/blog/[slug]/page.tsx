import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getPost, parseBody } from "@/lib/content";
import { ShareButton } from "@/components/ShareButton";
import { ListenButton } from "@/components/ListenButton";
import { ProductCard } from "@/components/ProductCard";
import { api, type ProductSummary } from "@/lib/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPost((await params).slug);
  return p ? { title: p.title, description: p.excerpt || p.title, alternates: { canonical: `/blog/${p.slug}` }, openGraph: { title: p.title, description: p.excerpt, images: p.cover_url ? [p.cover_url] : undefined, type: "article" } } : { title: "Article not found" };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPost((await params).slug);
  if (!p) notFound();
  const blocks = parseBody(p.body);
  const shop = p.tags.length ? await api<{ items: ProductSummary[] }>(`/products?tag=${p.tags.slice(0, 5).join(",")}&pageSize=4`).then((r) => r.items).catch(() => [] as ProductSummary[]) : [];
  const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const heads = blocks.flatMap((b) => (b.t === "h2" || b.t === "h3" ? [{ id: slug(b.text), text: b.text, sub: b.t === "h3" }] : []));
  const words = blocks.reduce((n, b) => n + (b.t === "p" || b.t === "h2" || b.t === "h3" || b.t === "quote" ? b.text.split(/\s+/).length : b.t === "ul" ? b.items.join(" ").split(/\s+/).length : 0), 0);
  const minutes = Math.max(1, Math.round(words / 200));
  const when = p.published_at ? new Date(p.published_at) : null;
  const jsonLd = { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.excerpt || undefined, image: p.cover_url ? [p.cover_url] : undefined, datePublished: p.published_at ?? undefined, author: p.author_name ? { "@type": "Person", name: p.author_name } : undefined };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Journal", href: "/blog" }, { name: p.title }]} />
      <div aria-hidden className="read-progress" />
      <article className="mx-auto max-w-3xl">
        <header>
          <p className="eyebrow">{when ? when.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Journal"}{p.author_name ? ` · ${p.author_name}` : ""} · {minutes} min read</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-wide">{p.title}</h1>
          {p.excerpt && <p className="mt-4 text-lg text-muted">{p.excerpt}</p>}
          <div className="mt-4 flex gap-5"><ShareButton title={p.title} text={p.excerpt} /><ListenButton targetId="post-body" /></div>
        </header>
        {p.cover_url && <img src={p.cover_url} alt="" width={1200} height={700} fetchPriority="high" className="my-10 aspect-[16/9] w-full border border-line object-cover" />}
        {heads.length >= 3 && (
          <nav aria-label="In this article" className="mb-8 border border-line bg-card p-5">
            <p className="eyebrow !text-[0.65rem]">In this article</p>
            <ol className="mt-3 space-y-1.5 text-sm">{heads.map((h) => <li key={h.id} className={h.sub ? "ml-4" : ""}><a href={`#${h.id}`} className="text-muted transition hover:text-accent">{h.text}</a></li>)}</ol>
          </nav>
        )}
        <div id="post-body" className="space-y-5 leading-[1.8]">
          {blocks.map((b, i) =>
            b.t === "quote" ? <blockquote key={i} className="pull-quote">{b.text}</blockquote>
            : b.t === "h2" ? <h2 key={i} id={slug(b.text)} className="pt-6 text-2xl font-semibold">{b.text}</h2>
            : b.t === "h3" ? <h3 key={i} id={slug(b.text)} className="pt-4 text-xl font-semibold">{b.text}</h3>
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
      {shop.length > 0 && (
        <section className="mx-auto mt-20 max-w-5xl border-t border-line pt-10"><p className="eyebrow">Shop the story</p><div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">{shop.map((x) => <ProductCard key={x.id} p={x} />)}</div></section>
      )}
      {p.related.length > 0 && (
        <section className="mx-auto mt-20 max-w-3xl border-t border-line pt-10">
          <p className="eyebrow">Keep reading</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">{p.related.map((r) => <li key={r.slug}><Link href={`/blog/${r.slug}`} className="lift block border border-line bg-card"><img src={r.cover_url || `/ph/${r.slug}`} alt="" loading="lazy" width={400} height={260} className="aspect-[3/2] w-full object-cover" /><span className="block p-4 text-sm font-medium leading-snug">{r.title}</span></Link></li>)}</ul>
        </section>
      )}
    </>
  );
}
