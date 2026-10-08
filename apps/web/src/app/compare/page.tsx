"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pkr, type ProductDetail } from "@/lib/api";
import { useShopper } from "@/components/Shopper";
import { MascotFigure } from "@/components/Mascot";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function Compare() {
  const { compare, toggleCompare, clearCompare } = useShopper();
  const [details, setDetails] = useState<Record<string, ProductDetail>>({});
  const key = compare.map((c) => c.slug).join(",");

  useEffect(() => {
    let live = true;
    compare.filter((c) => !details[c.slug]).forEach((c) =>
      fetch(`${BASE}/products/${c.slug}`).then((r) => r.json()).then((d) => live && d?.id && setDetails((m) => ({ ...m, [c.slug]: d }))).catch(() => {}));
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (compare.length === 0)
    return (
      <div className="py-24 text-center">
        <MascotFigure mood="confused" size={96} className="mx-auto mb-4 text-fg" />
        <p className="eyebrow">Compare</p>
        <p className="mt-3 text-muted">Pick up to 4 products with the compare button on each card.</p>
        <Link href="/products" className="btn btn-primary mt-8">Browse the collection</Link>
      </div>
    );

  const rows: [string, (d: ProductDetail) => React.ReactNode][] = [
    ["Brand", (d) => d.brand_name ?? "—"],
    ["Price", (d) => <span className="font-semibold">{pkr(d.selling_price)}</span>],
    ["You save", (d) => (Number(d.marked_price) > Number(d.selling_price) ? `${pkr(Number(d.marked_price) - Number(d.selling_price))} (${d.discount_pct ?? Math.round(((Number(d.marked_price) - Number(d.selling_price)) / Number(d.marked_price)) * 100)}%)` : "—")],
    ["Availability", (d) => (d.stock_quantity === 0 ? "Sold out" : d.stock_quantity <= 5 ? `Only ${d.stock_quantity} left` : "In stock")],
    ["Options", (d) => (d.variants.length ? d.variants.map((v) => v.title).join(", ") : "—")],
    ["Bulk pricing", (d) => (d.priceTiers.length ? `from ${d.priceTiers[0].min_qty} units: ${pkr(d.priceTiers[0].unit_price)}` : "—")],
    ["Min. order", (d) => String(d.moq)],
    ["Description", (d) => <span className="text-muted">{(d.description ?? "").slice(0, 120) || "—"}</span>],
  ];
  const cell = "border-t border-line px-4 py-4 align-top text-sm";

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div><p className="eyebrow">Side by side</p><h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Compare</h1></div>
        <button onClick={clearCompare} className="text-xs font-semibold uppercase tracking-[0.2em] text-muted transition hover:text-accent">Clear all</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr>
              <th className="w-32 px-4 pb-4" />
              {compare.map((c) => (
                <th key={c.slug} className="px-4 pb-4 align-top font-normal">
                  <Link href={`/products/${c.slug}`} className="block">
                    {c.image && <img src={c.image} alt={c.title} width={200} height={250} className="mb-3 aspect-[4/5] w-full max-w-[200px] border border-line object-cover" />}
                    <span className="text-sm font-medium hover:text-accent">{c.title}</span>
                  </Link>
                  <button onClick={() => toggleCompare(c)} className="mt-2 block text-[0.65rem] uppercase tracking-[0.2em] text-muted transition hover:text-accent">Remove</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, render]) => (
              <tr key={label}>
                <th scope="row" className={`${cell} eyebrow !text-[0.65rem]`}>{label}</th>
                {compare.map((c) => <td key={c.slug} className={cell}>{details[c.slug] ? render(details[c.slug]) : <span className="text-muted">…</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
