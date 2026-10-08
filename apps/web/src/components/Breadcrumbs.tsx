import Link from "next/link";

export interface Crumb { name: string; href?: string }

/** Visual breadcrumb trail + schema.org BreadcrumbList for SEO. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, ...(c.href ? { item: site + c.href } : {}) })),
  };
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-[0.7rem] uppercase tracking-[0.2em] text-muted">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\u003c") }} />
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((c, i) => (
          <li key={c.name} className="flex items-center gap-2">
            {c.href ? <Link href={c.href} className="transition hover:text-accent">{c.name}</Link> : <span aria-current="page" className="text-fg">{c.name}</span>}
            {i < items.length - 1 && <span aria-hidden className="text-accent">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
