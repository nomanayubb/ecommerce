import type { ReactNode } from "react";
import Link from "next/link";
import type { Section, SectionCtx } from "@/lib/sections";
import { api } from "@/lib/api";
import { getPosts, getRecipes } from "@/lib/content";
import { PickedLazy } from "./PickedLazy";
import { ArrowRightIcon, TruckIcon, CashIcon, ShieldIcon, SupportIcon, PackageIcon, StarIcon, HeartIcon } from "../icons";
import { Reveal } from "../Motion";
import { RecipeCard } from "../RecipeBits";
import { parseCoords, type Place } from "@/lib/geo";
import dynamic from "next/dynamic";
// Heavier interactive pieces load only on pages that actually render them (keeps the first load small).
const VideoPlayer = dynamic(() => import("../PdpExtras").then((m) => m.VideoPlayer));
const ContactForm = dynamic(() => import("./ExtraClient").then((m) => m.ContactForm));
const Countdown = dynamic(() => import("./ExtraClient").then((m) => m.Countdown));
const LeafletMap = dynamic(() => import("./ExtraClient").then((m) => m.LeafletMap));
const StatCounter = dynamic(() => import("./ExtraClient").then((m) => m.StatCounter));

type P = { s: Section; ctx: SectionCtx };
type Settings = Record<string, string | number | boolean>;

function Head({ eyebrow, heading, center }: { eyebrow?: unknown; heading?: unknown; center?: boolean }) {
  if (!eyebrow && !heading) return null;
  return (
    <div className={`sec-head mb-8 ${center ? "text-center" : ""}`}>
      {eyebrow ? <p className="eyebrow">{String(eyebrow)}</p> : null}
      {heading ? <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">{String(heading)}</h2> : null}
    </div>
  );
}
const href = (h: unknown) => (typeof h === "string" && h ? h : "");
const A = ({ href: h, className, children }: { href: string; className?: string; children: ReactNode }) =>
  h.startsWith("/") ? <Link href={h} className={className}>{children}</Link> : <a href={h} className={className} rel="noopener noreferrer" target="_blank">{children}</a>;

export function Timeline({ s }: P) {
  const v = s.settings as Settings;
  if (!s.blocks.length) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <ol className="relative ml-3 border-l border-line">
        {s.blocks.map((b, i) => (
          <li key={b.id} className="pb-10 pl-8 last:pb-0">
            <Reveal delay={i * 70}>
              <span aria-hidden className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-accent bg-bg" />
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">{String(b.settings.year ?? "")}</p>
              <h3 className="mt-1 text-lg font-semibold">{String(b.settings.title ?? "")}</h3>
              {b.settings.text ? <p className="mt-2 max-w-xl leading-relaxed text-muted">{String(b.settings.text)}</p> : null}
              {b.settings.imageUrl ? <img src={String(b.settings.imageUrl)} alt="" loading="lazy" className="mt-4 max-h-56 w-full max-w-md border border-line object-cover" /> : null}
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Team({ s }: P) {
  const v = s.settings as Settings;
  if (!s.blocks.length) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <ul className={`grid grid-cols-2 gap-5 ${String(v.columns) === "3" ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
        {s.blocks.map((b, i) => (
          <li key={b.id}>
            <Reveal delay={i * 60}>
              <div className="border border-line bg-card">
                {b.settings.imageUrl ? <img src={String(b.settings.imageUrl)} alt={String(b.settings.name ?? "")} loading="lazy" className="aspect-[4/5] w-full object-cover" /> : <div className="grid aspect-[4/5] place-items-center text-5xl font-semibold text-accent/50" aria-hidden>{String(b.settings.name ?? "?").slice(0, 1)}</div>}
                <div className="p-4"><p className="font-semibold">{String(b.settings.name ?? "")}</p><p className="text-xs uppercase tracking-widest text-accent">{String(b.settings.role ?? "")}</p>{b.settings.bio ? <p className="mt-2 text-sm text-muted">{String(b.settings.bio)}</p> : null}</div>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Contact({ s }: P) {
  const v = s.settings as Settings;
  const c = parseCoords(String(v.coords ?? ""));
  const places: Place[] = c ? [{ name: String(v.heading || "Find us"), address: String(v.address ?? ""), lat: c[0], lng: c[1] }] : [];
  const rows: [string, string, string?][] = [["Email", String(v.email ?? ""), v.email ? `mailto:${v.email}` : undefined], ["Phone", String(v.phone ?? ""), v.phone ? `tel:${String(v.phone).replace(/[^+\d]/g, "")}` : undefined], ["Address", String(v.address ?? "")], ["Hours", String(v.hours ?? "")]];
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <div className={`grid gap-10 ${v.showForm ? "lg:grid-cols-[1fr_1.2fr]" : ""}`}>
        <div>
          {v.intro ? <p className="max-w-md leading-relaxed text-muted">{String(v.intro)}</p> : null}
          <dl className="mt-6 space-y-4 text-sm">
            {rows.filter((r) => r[1]).map(([k, val, link]) => <div key={k}><dt className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">{k}</dt><dd className="mt-1 whitespace-pre-line">{link ? <a href={link} className="text-accent hover:underline">{val}</a> : val}</dd></div>)}
          </dl>
        </div>
        {v.showForm ? <ContactForm /> : null}
      </div>
      {places.length > 0 && <div className="mt-10"><LeafletMap places={places} /></div>}
    </section>
  );
}

export function PlaceMap({ s }: P) {
  const v = s.settings as Settings;
  const places: Place[] = s.blocks.flatMap((b) => {
    const c = parseCoords(String(b.settings.coords ?? ""));
    return c ? [{ name: String(b.settings.name ?? ""), address: String(b.settings.address ?? ""), lat: c[0], lng: c[1], href: href(b.settings.href), phone: String(b.settings.phone ?? "") }] : [];
  });
  if (!places.length) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      {v.intro ? <p className="-mt-4 mb-6 max-w-xl text-muted">{String(v.intro)}</p> : null}
      <LeafletMap places={places} />
    </section>
  );
}

export function Gallery({ s }: P) {
  const v = s.settings as Settings;
  const photos = s.blocks.filter((b) => b.settings.imageUrl);
  if (!photos.length) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <ul className={`grid grid-cols-2 gap-3 ${String(v.columns) === "3" ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
        {photos.map((b, i) => {
          const inner = (
            <figure className="group relative overflow-hidden border border-line">
              <img src={String(b.settings.imageUrl)} alt={String(b.settings.caption || b.settings.credit || "")} loading="lazy" className="aspect-square w-full object-cover transition duration-700 group-hover:scale-105" />
              {(b.settings.caption || b.settings.credit) && <figcaption className="absolute inset-x-0 bottom-0 translate-y-full bg-black/70 p-3 text-xs text-white transition group-hover:translate-y-0 group-focus-within:translate-y-0">{String(b.settings.caption ?? "")}{b.settings.credit ? <span className="block text-gold">{String(b.settings.credit)}</span> : null}</figcaption>}
            </figure>
          );
          const link = href(b.settings.href);
          return <li key={b.id}><Reveal delay={(i % 4) * 60}>{link ? <A href={link}>{inner}</A> : inner}</Reveal></li>;
        })}
      </ul>
      {v.followHref ? <p className="mt-6 text-center"><A href={String(v.followHref)} className="btn btn-ghost">{String(v.followLabel || "Follow us")}</A></p> : null}
    </section>
  );
}

export function Events({ s }: P) {
  const v = s.settings as Settings;
  const now = Date.now();
  const upcoming = s.blocks.filter((b) => b.settings.startsAt && new Date(String(b.settings.startsAt)).getTime() > now).sort((a, b) => +new Date(String(a.settings.startsAt)) - +new Date(String(b.settings.startsAt)));
  if (!upcoming.length) return null;
  const [next, ...rest] = upcoming;
  const when = (d: string) => new Date(d).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <div className="border border-accent bg-card p-8">
        <p className="eyebrow !text-[0.65rem]">Next up · {when(String(next.settings.startsAt))}</p>
        <h3 className="mt-2 text-2xl font-semibold">{String(next.settings.title ?? "")}</h3>
        {next.settings.text ? <p className="mt-2 max-w-xl text-muted">{String(next.settings.text)}</p> : null}
        <div className="mt-6 flex flex-wrap items-center gap-8"><Countdown to={String(next.settings.startsAt)} />{href(next.settings.href) && <A href={href(next.settings.href)} className="btn btn-primary">{String(next.settings.buttonLabel || "Details")}</A>}</div>
      </div>
      {rest.length > 0 && <ul className="mt-4 divide-y divide-line border border-line">{rest.map((b) => <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><span><strong>{String(b.settings.title ?? "")}</strong><span className="ml-3 text-muted">{when(String(b.settings.startsAt))}</span></span>{href(b.settings.href) && <A href={href(b.settings.href)} className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{String(b.settings.buttonLabel || "Details")} →</A>}</li>)}</ul>}
    </section>
  );
}

/** Turns a Spotify / Apple Podcasts / SoundCloud share link into its embeddable player (anything else is not embedded). */
function audioEmbed(u: string): { src: string; height: number } | null {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "open.spotify.com" && /^\/(episode|show|track|playlist|album)\//.test(url.pathname)) return { src: `https://open.spotify.com/embed${url.pathname}`, height: 232 };
    if (host === "podcasts.apple.com") return { src: `https://embed.podcasts.apple.com${url.pathname}${url.search}`, height: 175 };
    if (host === "soundcloud.com") return { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u)}&color=%23c89c3a`, height: 166 };
  } catch {}
  return null;
}
export function Podcast({ s }: P) {
  const v = s.settings as Settings;
  const url = String(v.embedUrl ?? "");
  const audio = audioEmbed(url);
  const isVideo = /youtu\.?be/.test(url);
  if (!audio && !isVideo) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      {v.text ? <p className="-mt-4 mb-6 max-w-xl text-muted">{String(v.text)}</p> : null}
      {audio ? <iframe src={audio.src} title={String(v.heading || "Podcast player")} loading="lazy" allow="encrypted-media" className="w-full border-0" style={{ height: audio.height }} /> : <div className="aspect-video overflow-hidden border border-line"><VideoPlayer url={url} title={String(v.heading || "Podcast")} /></div>}
    </section>
  );
}

export function VideoStory({ s }: P) {
  const v = s.settings as Settings;
  const url = String(v.videoUrl ?? "");
  if (!url) return null;
  const video = <div className="aspect-video overflow-hidden border border-line"><VideoPlayer url={url} poster={v.posterUrl ? String(v.posterUrl) : undefined} title={String(v.heading || "Video")} /></div>;
  const text = (
    <div>{v.eyebrow ? <p className="eyebrow">{String(v.eyebrow)}</p> : null}{v.heading ? <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">{String(v.heading)}</h2> : null}{v.text ? <p className="mt-4 max-w-md leading-relaxed text-muted">{String(v.text)}</p> : null}</div>
  );
  return v.layout === "wide" ? <section className="space-y-6">{video}{text}</section> : <section className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">{video}{text}</section>;
}

export function Stats({ s }: P) {
  const v = s.settings as Settings;
  if (!s.blocks.length) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {s.blocks.map((b) => <StatCounter key={b.id} value={Number(String(b.settings.value ?? "0").replace(/[^\d.]/g, "")) || 0} prefix={String(b.settings.prefix ?? "")} suffix={String(b.settings.suffix ?? "")} label={String(b.settings.label ?? "")} progress={Number(b.settings.progress) || 0} />)}
      </div>
      {v.note ? <p className="mt-4 text-xs text-muted">{String(v.note)}</p> : null}
    </section>
  );
}

export async function BlogGrid({ s }: P) {
  const v = s.settings as Settings;
  const qs = new URLSearchParams({ pageSize: String(Number(v.count) || 3) });
  if (v.tag) qs.set("tag", String(v.tag));
  const { items } = await getPosts(qs.toString());
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-8 flex items-end justify-between"><div>{v.eyebrow ? <p className="eyebrow">{String(v.eyebrow)}</p> : null}{v.heading ? <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">{String(v.heading)}</h2> : null}</div><Link href="/blog" className="text-xs font-semibold uppercase tracking-[0.2em] hover:text-accent">All articles →</Link></div>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => <li key={p.id}><Link href={`/blog/${p.slug}`} className="lift block h-full border border-line bg-card"><img src={p.cover_url || `/ph/${p.slug}`} alt="" loading="lazy" width={600} height={400} className="aspect-[3/2] w-full object-cover" /><div className="p-5"><h3 className="font-semibold leading-snug">{p.title}</h3><p className="mt-2 line-clamp-2 text-sm text-muted">{p.excerpt}</p></div></Link></li>)}
      </ul>
    </section>
  );
}

export async function RecipeGrid({ s }: P) {
  const v = s.settings as Settings;
  const qs = new URLSearchParams({ pageSize: String(Number(v.count) || 4) });
  if (v.season) qs.set("season", String(v.season).toLowerCase());
  if (v.difficulty) qs.set("difficulty", String(v.difficulty));
  const { items } = await getRecipes(qs.toString());
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-8 flex items-end justify-between"><div>{v.eyebrow ? <p className="eyebrow">{String(v.eyebrow)}</p> : null}{v.heading ? <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em]">{String(v.heading)}</h2> : null}</div><Link href="/recipes" className="text-xs font-semibold uppercase tracking-[0.2em] hover:text-accent">All recipes →</Link></div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{items.map((r) => <RecipeCard key={r.id} r={r} />)}</div>
    </section>
  );
}

/** Raw HTML written by the shop's own admins (embeds, widgets). Not user-submitted content. */
export function CustomCode({ s }: P) {
  const html = String((s.settings as Settings).html ?? "");
  if (!html.trim()) return null;
  return <section dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Chips({ s }: P) {
  const v = s.settings as Settings;
  const items = s.blocks.filter((b) => b.settings.label && b.settings.href);
  if (!items.length) return null;
  return (
    <section className={v.align === "center" ? "text-center" : ""}>
      <Head eyebrow={v.eyebrow} heading={v.heading} center={v.align === "center"} />
      <ul className={`flex flex-wrap gap-2.5 ${v.align === "center" ? "justify-center" : ""}`}>
        {items.map((b) => <li key={b.id}><A href={String(b.settings.href)} className="inline-block border border-line bg-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-accent hover:text-accent">{String(b.settings.label)}</A></li>)}
      </ul>
    </section>
  );
}

/** Pure CSS ticker: the lines are repeated twice and slide left; with motion off it simply wraps. */
export function Marquee({ s }: P) {
  const v = s.settings as Settings;
  const lines = String(v.text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="marquee-row flex shrink-0 items-center">
      {lines.map((l, i) => <li key={i} className="flex items-center whitespace-nowrap px-6 text-xs font-semibold uppercase tracking-[0.3em]">{l}<span aria-hidden className="ml-12 h-1.5 w-1.5 rotate-45 bg-accent" /></li>)}
    </ul>
  );
  return (
    <section aria-label="Highlights" className="marquee -mx-4 overflow-hidden border-y border-line bg-card/60 py-3.5 sm:mx-0" data-speed={String(v.speed ?? "normal")}>
      <div className="marquee-track flex w-max">{row(false)}{row(true)}</div>
    </section>
  );
}

export function PromoBanner({ s }: P) {
  const v = s.settings as Settings;
  if (!v.heading && !v.text) return null;
  const centre = v.align === "center";
  return (
    <section className={`promo relative -mx-4 overflow-hidden text-ondark sm:mx-0 ${v.height === "sm" ? "py-10" : "py-16 sm:py-24"}`} style={{ background: "rgb(var(--dark))" }}>
      {v.imageUrl ? <img src={String(v.imageUrl)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(60% 90% at 80% 20%, rgb(var(--accent-bright) / .22), transparent 70%)" }} />}
      <div className={`absolute inset-0 ${centre ? "bg-black/55" : "bg-gradient-to-r from-black/75 via-black/40 to-transparent"}`} />
      <div className={`relative px-6 sm:px-14 ${centre ? "mx-auto max-w-2xl text-center" : "max-w-xl"}`}>
        {v.eyebrow ? <p className="eyebrow">{String(v.eyebrow)}</p> : null}
        {v.heading ? <h2 className="mt-3 text-3xl font-semibold uppercase leading-tight tracking-[0.06em] sm:text-4xl">{String(v.heading)}</h2> : null}
        {v.text ? <p className="mt-4 max-w-md text-ondark/75" style={centre ? { marginInline: "auto" } : undefined}>{String(v.text)}</p> : null}
        {v.buttonLabel && v.buttonHref ? <div className="mt-7"><A href={String(v.buttonHref)} className="btn btn-primary">{String(v.buttonLabel)} <ArrowRightIcon size={16} /></A></div> : null}
      </div>
    </section>
  );
}

const STEP_ICON: Record<string, (p: { size?: number }) => ReactNode> = { truck: TruckIcon, cash: CashIcon, shield: ShieldIcon, support: SupportIcon, package: PackageIcon, star: StarIcon, heart: HeartIcon };
export function Steps({ s }: P) {
  const v = s.settings as Settings;
  if (!s.blocks.length) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <ol className={`relative grid gap-8 ${s.blocks.length >= 4 ? "md:grid-cols-4" : s.blocks.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {s.blocks.map((b, i) => {
          const Ic = STEP_ICON[String(b.settings.icon)] ?? PackageIcon;
          return (
            <li key={b.id}>
              <Reveal delay={i * 90}>
                <div className="flex items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center border border-accent text-accent"><Ic size={22} /></span><span aria-hidden className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent" /></div>
                <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-accent">Step {i + 1}</p>
                <h3 className="mt-1 text-base font-semibold">{String(b.settings.title ?? "")}</h3>
                {b.settings.text ? <p className="mt-2 text-sm leading-relaxed text-muted">{String(b.settings.text)}</p> : null}
              </Reveal>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export async function BrandGrid({ s }: P) {
  const v = s.settings as Settings;
  const brands = await api<{ name: string; slug: string }[]>("/brands", { revalidate: 300 }).catch(() => []);
  if (!brands.length) return null;
  return (
    <section>
      <Head eyebrow={v.eyebrow} heading={v.heading} />
      <ul className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-4">
        {brands.map((b) => <li key={b.slug} className="bg-card"><Link href={`/products?brand=${b.slug}`} className="group flex h-24 items-center justify-center px-4 text-center text-sm font-semibold uppercase tracking-[0.3em] text-muted transition hover:bg-accent/5 hover:text-accent">{b.name}</Link></li>)}
      </ul>
    </section>
  );
}

export function PickedForYou({ s }: P) {
  const v = s.settings as Settings;
  return <PickedLazy eyebrow={String(v.eyebrow ?? "")} heading={String(v.heading ?? "")} />;
}
