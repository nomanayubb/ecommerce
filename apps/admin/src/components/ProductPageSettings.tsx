"use client";

export type PdpValues = { imageSide: "left" | "right"; galleryThumbs: "side" | "below"; [k: string]: boolean | string };
export const PDP_DEFAULTS: PdpValues = {
  showAddToCart: true, showBuyNow: false, showAddress: true,
  imageSide: "left", galleryThumbs: "side", showShare: true, showSaveCompare: true, showRating: true, showLiveViewers: true, showDetails: true, showTags: true, showSku: true,
  showTrustIcons: true, showDispatch: true, showBenefits: true, showReviews: true, showQuestions: true, showRecipes: true, showRelated: true, showRecentlyViewed: true, showSectionTabs: true, stickyInfo: true,
};
const GROUPS: { title: string; items: [string, string][] }[] = [
  { title: "Buy buttons (all products; a product can override these in its own editor)", items: [
    ["showAddToCart", "Show Add to bag (and the quick-add on product cards)"], ["showBuyNow", "Show Buy now (adds the item and goes straight to checkout)"], ["showAddress", "Show the delivery address / city check under the buttons"],
  ] },
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
const select = "w-full max-w-md rounded border border-line bg-card px-3 py-2 text-sm";

/** What every product page shows and how it is arranged. Part of the theme settings. */
export function ProductPageSettings({ value, onChange }: { value?: Partial<PdpValues>; onChange: (v: PdpValues) => void }) {
  const pdp = { ...PDP_DEFAULTS, ...(value ?? {}) } as PdpValues;
  const set = (patch: Partial<PdpValues>) => onChange({ ...pdp, ...patch } as PdpValues);
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted">Controls every product page at once.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted">Photos sit on the
          <select className={`mt-1 ${select}`} value={pdp.imageSide} onChange={(e) => set({ imageSide: e.target.value as PdpValues["imageSide"] })}><option value="left">Left, details on the right</option><option value="right">Right, details on the left</option></select>
        </label>
        <label className="block text-xs font-medium text-muted">Small photos (thumbnails)
          <select className={`mt-1 ${select}`} value={pdp.galleryThumbs} onChange={(e) => set({ galleryThumbs: e.target.value as PdpValues["galleryThumbs"] })}><option value="side">In a column beside the main photo</option><option value="below">In a row below the main photo</option></select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!pdp.stickyInfo} onChange={(e) => set({ stickyInfo: e.target.checked })} />Keep the details column in view while scrolling the photos</label>
      {GROUPS.map((g) => (
        <fieldset key={g.title} className="space-y-2 border-t border-line pt-4">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">{g.title}</legend>
          {g.items.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!pdp[k]} onChange={(e) => set({ [k]: e.target.checked })} />{l}</label>)}
        </fieldset>
      ))}
    </div>
  );
}
