"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { pkr, type ProductDetail } from "@/lib/api";
import { useShopper, type Lite } from "@/components/Shopper";
import { MascotFigure } from "@/components/Mascot";
import { useCart } from "@/components/CartProvider";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const toLite = (p: ProductDetail): Lite => ({ id: p.id, slug: p.slug, title: p.title, price: Number(p.selling_price), marked: Number(p.marked_price), image: p.images?.[0], brand: p.brand_name });

function Page() {
  const { compare, toggleCompare, clearCompare } = useShopper();
  const { add } = useCart();
  const shared = useSearchParams().get("items");
  const sharedSlugs = useMemo(() => (shared ? shared.split(",").filter((s) => /^[a-z0-9-]{1,100}$/.test(s)).slice(0, 4) : []), [shared]);
  const [details, setDetails] = useState<Record<string, ProductDetail>>({});
  const [diff, setDiff] = useState(false);
  const [copied, setCopied] = useState(false);
  const list: Lite[] = sharedSlugs.length ? sharedSlugs.map((s) => details[s]).filter(Boolean).map(toLite) : compare;
  const slugs = sharedSlugs.length ? sharedSlugs : compare.map((c) => c.slug);
  const key = slugs.join(",");

  useEffect(() => {
    let live = true;
    slugs.filter((s) => !details[s]).forEach((s) =>
      fetch(`${BASE}/products/${s}`).then((r) => r.json()).then((d) => live && d?.id && setDetails((m) => ({ ...m, [s]: d }))).catch(() => {}));
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (slugs.length === 0)
    return (
      <div className="py-24 text-center">
        <MascotFigure mood="confused" size={96} className="mx-auto mb-4 text-fg" />
        <p className="eyebrow">Compare</p>
        <p className="mt-3 text-muted">Pick up to 4 products with the compare button on each card.</p>
        <Link href="/products" className="btn btn-primary mt-8">Browse the collection</Link>
      </div>
    );

  // [label, plain value (used to spot differences), optional fancy rendering]
  const rows: [string, (d: ProductDetail) => string, ((d: ProductDetail) => React.ReactNode)?][] = [
    ["Brand", (d) => d.brand_name ?? "—"],
    ["Price", (d) => pkr(d.selling_price), (d) => <span className="font-semibold">{pkr(d.selling_price)}</span>],
    ["You save", (d) => (Number(d.marked_price) > Number(d.selling_price) ? pkr(Number(d.marked_price) - Number(d.selling_price)) : "—")],
    ["Availability", (d) => (d.stock_quantity === 0 ? "Sold out" : d.stock_quantity <= 5 ? `Only ${d.stock_quantity} left` : "In stock")],
    ["Options", (d) => (d.variants.length ? d.variants.map((v) => v.title).join(", ") : "—")],
    ["Bulk pricing", (d) => (d.priceTiers.length ? `from ${d.priceTiers[0].min_qty} units: ${pkr(d.priceTiers[0].unit_price)}` : "—")],
    ["Min. order", (d) => String(d.moq)],
    ["Description", (d) => (d.description ?? "").slice(0, 120) || "—", (d) => <span className="text-muted">{(d.description ?? "").slice(0, 120) || "—"}</span>],
  ];
  const cell = "border-t border-line px-4 py-4 align-top text-sm";
  const ready = list.filter((c) => details[c.slug]);
  const same = (get: (d: ProductDetail) => string) => ready.length > 1 && ready.every((c) => get(details[c.slug]) === get(details[ready[0].slug]));
  const share = async () => {
    const url = `${location.origin}/compare?items=${slugs.join(",")}`;
    try { if (navigator.share) await navigator.share({ title: "Product comparison", url }); else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2200); } } catch {}
  };

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div><p className="eyebrow">{sharedSlugs.length ? "Shared with you" : "Side by side"}</p><h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Compare</h1></div>
        <div className="flex flex-wrap items-center gap-5 text-xs font-semibold uppercase tracking-[0.2em]">
          <label className="flex cursor-pointer items-center gap-2 text-muted"><input type="checkbox" checked={diff} onChange={(e) => setDiff(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />Highlight differences</label>
          <button onClick={share} className="text-muted transition hover:text-accent">{copied ? "Link copied" : "Share"}</button>
          {!sharedSlugs.length && <button onClick={clearCompare} className="text-muted transition hover:text-accent">Clear all</button>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr>
              <th className="w-32 px-4 pb-4" />
              {list.map((c) => (
                <th key={c.slug} className="px-4 pb-4 align-top font-normal">
                  <Link href={`/products/${c.slug}`} className="block">
                    {c.image && <img src={c.image} alt={c.title} width={200} height={250} className="mb-3 aspect-[4/5] w-full max-w-[200px] border border-line object-cover" />}
                    <span className="text-sm font-medium hover:text-accent">{c.title}</span>
                  </Link>
                  {!sharedSlugs.length && <button onClick={() => toggleCompare(c)} className="mt-2 block text-[0.65rem] uppercase tracking-[0.2em] text-muted transition hover:text-accent">Remove</button>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, get, fancy]) => {
              const dim = diff && same(get);
              return (
                <tr key={label} className={dim ? "opacity-40" : diff ? "bg-accent/5" : ""}>
                  <th scope="row" className={`${cell} eyebrow !text-[0.65rem]`}>{label}</th>
                  {list.map((c) => <td key={c.slug} className={cell}>{details[c.slug] ? (fancy ? fancy(details[c.slug]) : get(details[c.slug])) : <span className="text-muted">…</span>}</td>)}
                </tr>
              );
            })}
            <tr>
              <th scope="row" className={`${cell} eyebrow !text-[0.65rem]`} />
              {list.map((c) => {
                const d = details[c.slug];
                const simple = d && !d.variants.length && d.stock_quantity > 0 && d.moq <= 1;
                return <td key={c.slug} className={cell}>{!d ? null : simple ? <button className="btn btn-primary !px-4 !py-2.5" onClick={() => add({ productId: d.id, variantId: null, title: d.title, price: Number(d.selling_price), image: d.images[0], quantity: 1 })}>Add to bag</button> : <Link href={`/products/${c.slug}`} className="btn btn-ghost !px-4 !py-2.5">{d.stock_quantity === 0 ? "Sold out" : "Choose options"}</Link>}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Compare() {
  return <Suspense fallback={<p className="text-muted">Loading…</p>}><Page /></Suspense>;
}
