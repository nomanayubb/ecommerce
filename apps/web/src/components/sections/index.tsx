import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { api, type ProductDetail, type ProductSummary } from "@/lib/api";
import type { Section, SectionCtx } from "@/lib/sections";
import { ProductCard } from "../ProductCard";
import { Reveal } from "../Motion";
import { Logo3D } from "../Logo3D";
import { RecentlyViewed } from "../RecentlyViewed";
import { NewsletterForm } from "../NewsletterForm";
import { Gallery } from "../Gallery";
import { BuyPanel } from "../BuyPanel";
import { Countdown } from "./Countdown";
import { ArrowRightIcon, CashIcon, HeartIcon, PackageIcon, ShieldIcon, StarIcon, SupportIcon, TruckIcon } from "../icons";

type P = { s: Section; ctx: SectionCtx };
type Settings = Record<string, any>;

function A({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return href.startsWith("/") ? <Link href={href} className={className}>{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
}

function Head({ eyebrow, heading, href, linkLabel = "View all", center }: { eyebrow?: string; heading?: string; href?: string; linkLabel?: string; center?: boolean }) {
  if (!eyebrow && !heading) return null;
  return (
    <div className={`mb-6 flex items-end justify-between ${center ? "justify-center text-center" : ""}`}>
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}{heading && <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">{heading}</h2>}</div>
      {href && <A href={href} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:text-accent">{linkLabel} <ArrowRightIcon size={16} /></A>}
    </div>
  );
}

/** Angular line art echoing the logo's strokes. Decorative only. */
function HeroArt() {
  const i = (n: number) => ({ "--i": n }) as CSSProperties;
  return (
    <svg aria-hidden viewBox="0 0 600 600" className="pointer-events-none absolute right-0 top-1/2 hidden h-[112%] -translate-y-1/2 opacity-90 lg:block" fill="none" strokeLinecap="square">
      <g className="float-g">
        <g stroke="rgb(var(--accent-bright))" strokeWidth="2">
          <path className="draw" style={i(0)} pathLength={1} d="M120 540 L300 60 L360 60" opacity=".9" />
          <path className="draw" style={i(1)} pathLength={1} d="M200 540 L360 130" opacity=".55" />
          <path className="draw" style={i(2)} pathLength={1} d="M300 340 L520 340 L560 200 L600 200" />
          <path className="draw" style={i(3)} pathLength={1} d="M330 340 L350 420 L520 420 L548 340" opacity=".8" />
        </g>
        <g stroke="rgb(var(--accent-bright))" strokeWidth="2" opacity=".85">
          <circle className="draw" style={i(4)} pathLength={1} cx="380" cy="470" r="16" /><circle className="draw" style={i(5)} pathLength={1} cx="490" cy="470" r="16" />
        </g>
      </g>
      <g stroke="rgb(var(--on-dark))" strokeOpacity=".12" strokeWidth="1">
        {Array.from({ length: 10 }, (_, n) => <path key={n} d={`M${60 + n * 56} 600 L${300 + n * 30} 0`} />)}
      </g>
    </svg>
  );
}

function Hero({ s, ctx }: P) {
  const v = s.settings as Settings;
  const b = ctx.branding;
  const heading = v.heading || b.tagline || "Your world. Our store.";
  const eyebrow = v.eyebrow || b.name;
  const text = v.text || b.heroText || "";
  const pad = v.height === "md" ? "py-14 sm:py-20" : "py-20 sm:py-28";
  const packGrad = ctx.pack.decor?.heroGradient;
  const gradient = packGrad ?? "linear-gradient(120deg, rgb(var(--dark)) 0%, color-mix(in srgb, rgb(var(--dark)) 86%, rgb(var(--accent-bright))) 55%, rgb(var(--dark)) 100%)";
  const words = heading.split(" ").map((w: string, n: number) => <span key={n} className="kword" style={{ "--i": n } as CSSProperties}>{w}&nbsp;</span>);
  const copy = (
    <div className="relative max-w-xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold uppercase leading-[1.08] tracking-[0.04em] sm:text-6xl">{words}</h1>
      {text && <p className="mt-6 max-w-md text-base leading-relaxed text-ondark/70">{text}</p>}
      <div className="mt-10 flex flex-wrap gap-4">
        {v.primaryLabel && v.primaryHref && <A href={v.primaryHref} className="btn btn-shimmer bg-gold text-darksurface hover:bg-ondark">{v.primaryLabel}</A>}
        {v.secondaryLabel && v.secondaryHref && <A href={v.secondaryHref} className="btn border border-ondark/40 text-ondark hover:border-gold hover:text-gold">{v.secondaryLabel}</A>}
      </div>
    </div>
  );

  if (v.variant === "image" && v.imageUrl)
    return (
      <section className={`relative -mx-4 overflow-hidden px-6 text-ondark sm:mx-0 sm:px-14 ${pad}`} style={{ background: "rgb(var(--dark))" }}>
        <img src={v.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        {copy}
      </section>
    );
  if (v.variant === "split")
    return (
      <section className="-mx-4 grid overflow-hidden text-ondark sm:mx-0 md:grid-cols-2" style={{ background: "rgb(var(--dark))" }}>
        <div className={`px-6 sm:px-14 ${pad}`}>{copy}</div>
        <div className="relative min-h-64 md:min-h-full">{v.imageUrl ? <img src={v.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0" style={{ background: gradient }}><HeroArt /></div>}</div>
      </section>
    );
  return (
    <section className={`${packGrad ? "" : "hero-anim"} fade-up relative -mx-4 overflow-hidden px-6 text-ondark sm:mx-0 sm:px-14 ${pad}`} style={{ background: gradient }}>
      <div className="hero-glow" aria-hidden />
      <HeroArt />
      {copy}
    </section>
  );
}

function CollectionList({ s, ctx }: P) {
  const v = s.settings as Settings;
  const cats = ctx.categories.slice(0, v.count ?? 5);
  if (!cats.length) return null;
  return (
    <section>
      <Reveal><Head eyebrow={v.eyebrow} heading={v.heading} /></Reveal>
      <div className="grid auto-rows-[190px] grid-cols-2 gap-4 md:auto-rows-[210px] md:grid-cols-4">
        {cats.map((c, i) => (
          <Reveal key={c.id} delay={i * 90} className={i === 0 ? "col-span-2 row-span-2" : i < 3 ? "md:col-span-2" : ""}>
            <Link href={`/products?category=${c.slug}`} className="lift group relative block h-full overflow-hidden border border-line">
              <img src={`/ph/${c.slug}?ar=4x3`} alt="" loading="lazy" width={800} height={600} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-5 text-ondark">
                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gold">{String(i + 1).padStart(2, "0")}</p>
                <p className={`mt-1 font-semibold uppercase tracking-[0.15em] ${i === 0 ? "text-2xl" : "text-lg"}`}>{c.name}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const products = async (v: Settings) => {
  const qs = new URLSearchParams({ pageSize: String(v.count ?? 8), sort: v.sort ?? "newest" });
  if (v.categorySlug) qs.set("category", v.categorySlug);
  return (await api<{ items: ProductSummary[] }>(`/products?${qs}`).catch(() => ({ items: [] as ProductSummary[] }))).items;
};

async function FeaturedCollection({ s }: P) {
  const v = s.settings as Settings;
  const items = await products(v);
  const cols = ({ "2": "md:grid-cols-2", "3": "md:grid-cols-3", "4": "md:grid-cols-4" } as Record<string, string>)[String(v.columns)] ?? "md:grid-cols-4";
  return (
    <section>
      <Reveal><Head eyebrow={v.eyebrow} heading={v.heading} href={v.showViewAll ? (v.categorySlug ? `/products?category=${v.categorySlug}` : "/products") : undefined} /></Reveal>
      <div className={`grid grid-cols-2 gap-4 ${cols}`}>{items.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 80}><ProductCard p={p} /></Reveal>)}</div>
      {!items.length && <p className="text-muted">No products to show yet.</p>}
    </section>
  );
}

async function ProductCarousel({ s }: P) {
  const v = s.settings as Settings;
  const items = await products({ ...v, sort: "newest" });
  if (!items.length) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} href={v.categorySlug ? `/products?category=${v.categorySlug}` : "/products"} />
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]" tabIndex={0} aria-label={v.heading || "Products"}>
        {items.map((p) => <div key={p.id} className="w-56 shrink-0 snap-start sm:w-64"><ProductCard p={p} /></div>)}
      </div>
    </section>
  );
}

async function Spotlight({ s }: P) {
  const v = s.settings as Settings;
  if (!v.productSlug) return null;
  const p = await api<ProductDetail>(`/products/${v.productSlug}`).catch(() => null);
  if (!p) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <Gallery images={p.images} title={p.title} />
        <div>
          {p.brand_name && <p className="eyebrow">{p.brand_name}</p>}
          <h3 className="mb-6 mt-2 text-3xl font-semibold leading-tight">{p.title}</h3>
          <BuyPanel p={p} compact />
          <Link href={`/products/${p.slug}`} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] hover:text-accent">Full details <ArrowRightIcon size={16} /></Link>
        </div>
      </div>
    </section>
  );
}

function ImageWithText({ s }: P) {
  const v = s.settings as Settings;
  const text = (
    <div>
      {v.eyebrow && <p className="eyebrow">{v.eyebrow}</p>}
      {v.heading && <h2 className="mt-3 text-3xl font-semibold uppercase tracking-[0.1em]">{v.heading}</h2>}
      {v.text && <p className="mt-5 whitespace-pre-line leading-relaxed text-muted">{v.text}</p>}
      {v.buttonLabel && v.buttonHref && <A href={v.buttonHref} className="btn btn-primary mt-8">{v.buttonLabel}</A>}
    </div>
  );
  if (v.layout === "overlay")
    return (
      <section className="relative overflow-hidden border border-line text-ondark" style={{ background: "rgb(var(--dark))" }}>
        {v.imageUrl && <img src={v.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
        <div className="relative max-w-xl px-6 py-20 sm:px-14 [&_p]:text-ondark/80">{text}</div>
      </section>
    );
  return (
    <section className="grid items-center gap-10 md:grid-cols-2 lg:gap-16">
      <div className={v.layout === "right" ? "md:order-2" : ""}>{v.imageUrl ? <img src={v.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full border border-line object-cover" /> : <div className="aspect-[4/3] w-full border border-dashed border-line" />}</div>
      {text}
    </section>
  );
}

function RichText({ s }: P) {
  const v = s.settings as Settings;
  const paras = String(v.body ?? "").split(/\n\s*\n/).filter(Boolean);
  return (
    <section className={`mx-auto max-w-3xl ${v.align === "center" ? "text-center" : ""}`}>
      {v.eyebrow && <p className="eyebrow">{v.eyebrow}</p>}
      {v.heading && <h2 className="mt-3 text-3xl font-semibold uppercase tracking-[0.1em]">{v.heading}</h2>}
      <div className="mt-6 space-y-4 leading-relaxed text-muted">{paras.map((t, i) => <p key={i} className="whitespace-pre-line">{t}</p>)}</div>
    </section>
  );
}

const ICON: Record<string, (p: { size?: number }) => ReactNode> = { truck: TruckIcon, cash: CashIcon, shield: ShieldIcon, support: SupportIcon, package: PackageIcon, star: StarIcon, heart: HeartIcon };

function Multicolumn({ s }: P) {
  const v = s.settings as Settings;
  const cols = ({ "2": "md:grid-cols-2", "3": "md:grid-cols-3", "4": "md:grid-cols-4" } as Record<string, string>)[String(v.columns)] ?? "md:grid-cols-3";
  return (
    <section>
      <Head heading={v.heading} />
      <div className={`grid gap-px border border-line bg-line ${cols}`}>
        {s.blocks.map((b) => {
          const Ic = ICON[b.settings.icon] ?? PackageIcon;
          return <div key={b.id} className="bg-card p-6"><span className="text-fg"><Ic size={28} /></span><h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.18em]">{b.settings.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{b.settings.text}</p></div>;
        })}
      </div>
    </section>
  );
}

function Testimonials({ s }: P) {
  const v = s.settings as Settings;
  if (!s.blocks.length) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <div className="grid gap-4 md:grid-cols-3">
        {s.blocks.map((b) => (
          <figure key={b.id} className="border border-line bg-card p-6">
            <blockquote className="leading-relaxed">“{b.settings.quote}”</blockquote>
            <figcaption className="mt-4 text-xs uppercase tracking-[0.18em] text-muted"><span className="text-fg">{b.settings.name}</span>{b.settings.role ? ` · ${b.settings.role}` : ""}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function LogoBar({ s }: P) {
  const v = s.settings as Settings;
  if (!s.blocks.length) return null;
  return (
    <section className="text-center">
      {v.heading && <p className="eyebrow mb-6">{v.heading}</p>}
      <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {s.blocks.map((b) => {
          const inner = b.settings.imageUrl ? <img src={b.settings.imageUrl} alt={b.settings.name} className="h-8 w-auto opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" /> : <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">{b.settings.name}</span>;
          return <li key={b.id}>{b.settings.href ? <A href={b.settings.href}>{inner}</A> : inner}</li>;
        })}
      </ul>
    </section>
  );
}

function Faq({ s }: P) {
  const v = s.settings as Settings;
  if (!s.blocks.length) return null;
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.blocks.map((b) => ({ "@type": "Question", name: b.settings.question, acceptedAnswer: { "@type": "Answer", text: b.settings.answer } })) };
  return (
    <section className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <div className="divide-y divide-line border-y border-line">
        {s.blocks.map((b) => (
          <details key={b.id} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">{b.settings.question}<span className="text-accent transition group-open:rotate-45">+</span></summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{b.settings.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CountdownBanner({ s }: P) {
  const v = s.settings as Settings;
  return (
    <section className="border border-line px-6 py-12 text-center text-ondark sm:px-14" style={{ background: "linear-gradient(120deg, rgb(var(--dark)), color-mix(in srgb, rgb(var(--dark)) 80%, rgb(var(--accent-bright))))" }}>
      {v.eyebrow && <p className="eyebrow">{v.eyebrow}</p>}
      {v.heading && <h2 className="mt-3 text-3xl font-semibold uppercase tracking-[0.1em]">{v.heading}</h2>}
      {v.text && <p className="mx-auto mt-4 max-w-xl text-ondark/75">{v.text}</p>}
      {v.endsAt && <Countdown endsAt={v.endsAt} expiredText={v.expiredText} />}
      {v.buttonLabel && v.buttonHref && <A href={v.buttonHref} className="btn bg-gold text-darksurface hover:bg-ondark mt-8">{v.buttonLabel}</A>}
    </section>
  );
}

function Newsletter({ s }: P) {
  const v = s.settings as Settings;
  return (
    <section className="border border-line bg-card px-6 py-12 text-center sm:px-14">
      {v.heading && <h2 className="text-2xl font-semibold uppercase tracking-[0.12em]">{v.heading}</h2>}
      {v.text && <p className="mx-auto mt-3 max-w-md text-muted">{v.text}</p>}
      <div className="mx-auto max-w-sm text-left"><NewsletterForm /></div>
    </section>
  );
}

function PromiseSection({ s, ctx }: P) {
  const v = s.settings as Settings;
  const b = ctx.branding;
  const logo = b.logoUrl || "";
  const has3d = !!v.show3dLogo && logo.includes("logo-horizontal");
  return (
    <Reveal>
      <section className={`border border-line bg-card px-6 py-14 sm:px-16 ${has3d ? "grid items-center gap-10 text-center md:grid-cols-[240px_1fr] md:text-left" : "text-center"}`}>
        {has3d && <Logo3D src={logo.replace("logo-horizontal", "logo-mark")} srcDark={(b.logoUrlDark || logo).replace("logo-horizontal", "logo-mark")} alt={b.name} size={200} />}
        <div>
          <p className="eyebrow">{v.eyebrow || `The ${b.name} promise`}</p>
          <p className="mx-auto mt-4 max-w-2xl text-xl font-medium leading-relaxed sm:text-2xl">{v.text || b.promiseText || "Every order is checked, packed with care and sent with tracking."}</p>
        </div>
      </section>
    </Reveal>
  );
}

const MAP: Record<string, (p: P) => any> = {
  hero: Hero, "collection-list": CollectionList, "featured-collection": FeaturedCollection, "product-carousel": ProductCarousel, "product-spotlight": Spotlight,
  "image-with-text": ImageWithText, "rich-text": RichText, multicolumn: Multicolumn, testimonials: Testimonials, "logo-bar": LogoBar, faq: Faq,
  "countdown-banner": CountdownBanner, newsletter: Newsletter, promise: PromiseSection,
  "recently-viewed": ({ s }) => <RecentlyViewed title={s.settings.heading || "Recently viewed"} />,
  spacer: ({ s }) => <div aria-hidden style={{ height: Number(s.settings.height) || 48 }} />,
};

/** Renders a page's enabled sections in order. Unknown section types are skipped (never crash the page). */
export function SectionList({ sections, ctx }: { sections: Section[]; ctx: SectionCtx }) {
  return (
    <>
      {sections.filter((s) => s.enabled).map((s, i) => {
        const C = MAP[s.type] as any;
        if (!C) return null;
        return <div key={s.id} data-section={s.type} className={i === 0 || s.type === "spacer" ? "" : "mt-20"}><C s={s} ctx={ctx} /></div>;
      })}
    </>
  );
}
