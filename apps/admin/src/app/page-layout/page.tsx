"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Pdp { imageSide: "left" | "right"; galleryThumbs: "side" | "below"; [k: string]: boolean | string }
type Store = Record<string, unknown> & { pdp?: Partial<Pdp> };

const DEFAULTS: Pdp = {
  imageSide: "left", galleryThumbs: "side", showShare: true, showSaveCompare: true, showRating: true, showLiveViewers: true, showDetails: true, showTags: true, showSku: true,
  showTrustIcons: true, showDispatch: true, showBenefits: true, showReviews: true, showQuestions: true, showRecipes: true, showRelated: true, showRecentlyViewed: true, showSectionTabs: true, stickyInfo: true,
};
const GROUPS: { title: string; items: [string, string][] }[] = [
  { title: "Next to the photos", items: [
    ["showShare", "Share button and Ask on WhatsApp"], ["showSaveCompare", "Save (heart) and Compare buttons"], ["showRating", "Star rating under the title"], ["showLiveViewers", "\"People viewing now\" note"],
  ] },
  { title: "Inside the buy box", items: [
    ["showDispatch", "Same-day dispatch note"], ["showTrustIcons", "Product feature icons (from tags)"], ["showBenefits", "Four reassurance points (cash on delivery, free delivery, care, support)"],
  ] },
  { title: "Information list under the buy box", items: [
    ["showDetails", "Description, Delivery & returns and Payment"], ["showTags", "Tags"], ["showSku", "SKU with copy button"],
  ] },
  { title: "Below the product", items: [
    ["showSectionTabs", "Jump menu (Reviews, Questions, ...)"], ["showReviews", "Reviews"], ["showQuestions", "Questions and answers"], ["showRecipes", "Cooked with this (recipes)"], ["showRelated", "You may also like"], ["showRecentlyViewed", "Recently viewed"],
  ] },
];
const select = "w-full max-w-xs rounded border border-line bg-card px-3 py-2 text-sm";

export default function PageLayout() {
  const [store, setStore] = useState<Store | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { api<{ store: Store }>("/settings").then((r) => setStore(r.store)).catch((e) => setMsg({ ok: false, text: e.message })); }, []);
  if (!store) return <p className="text-muted">{msg?.text ?? "Loading..."}</p>;
  const pdp = { ...DEFAULTS, ...(store.pdp ?? {}) } as Pdp;
  const set = (patch: Partial<Pdp>) => setStore({ ...store, pdp: { ...pdp, ...patch } });

  async function save() {
    setMsg(null);
    try { await api("/admin/store-settings", { method: "PUT", body: JSON.stringify(store) }); setMsg({ ok: true, text: "Saved. Product pages update within about 30 seconds." }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save" }); }
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Page layout</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">Change how each kind of page looks. The product page is below. The home page and your own pages are built from sections in <Link href="/pages" className="text-accent hover:underline">Pages</Link>. What shoppers see after pressing Buy now is in <Link href="/settings" className="text-accent hover:underline">Brand &amp; settings</Link> under Checkout form. Buy buttons are set per product in the product editor.</p>
      {msg && <p className={`mb-4 text-sm ${msg.ok ? "text-accent" : "text-red-500"}`}>{msg.text}</p>}

      <div className="max-w-3xl space-y-6">
        <section className="space-y-4 rounded border border-line bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest">Product page: arrangement</h2>
          <label className="block text-xs font-medium text-muted">Photos sit on the
            <select className={`mt-1 ${select}`} value={pdp.imageSide} onChange={(e) => set({ imageSide: e.target.value as Pdp["imageSide"] })}><option value="left">Left, details on the right</option><option value="right">Right, details on the left</option></select>
          </label>
          <label className="block text-xs font-medium text-muted">Small photos (thumbnails)
            <select className={`mt-1 ${select}`} value={pdp.galleryThumbs} onChange={(e) => set({ galleryThumbs: e.target.value as Pdp["galleryThumbs"] })}><option value="side">In a column beside the main photo</option><option value="below">In a row below the main photo</option></select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!pdp.stickyInfo} onChange={(e) => set({ stickyInfo: e.target.checked })} />Keep the details column in view while scrolling the photos</label>
        </section>

        {GROUPS.map((g) => (
          <section key={g.title} className="space-y-3 rounded border border-line bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Product page: {g.title}</h2>
            {g.items.map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!pdp[k]} onChange={(e) => set({ [k]: e.target.checked })} />{l}</label>
            ))}
          </section>
        ))}
        <button onClick={save} className="rounded bg-brand px-6 py-2 text-sm font-medium text-onbrand">Save layout</button>
      </div>
    </>
  );
}
