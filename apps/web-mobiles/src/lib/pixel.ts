/**
 * Meta (Facebook) Pixel events. Switched on only when NEXT_PUBLIC_META_PIXEL_ID is set at build time (apps/<shop>/.env.production);
 * without it every call is a no-op and the browser loads nothing. The Pixel script itself is loaded late, when the page is idle (components/MetaPixel.tsx).
 * Events: PageView (every page), ViewContent (product page), AddToCart, BuyNowClick (custom, the Buy now button), InitiateCheckout, Purchase (order placed), Search, AddToWishlist, CompleteRegistration.
 */
export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type Data = Record<string, unknown>;
type W = { fbq?: (...a: unknown[]) => void; __pxq?: unknown[][] };

/** Send one event. `eventID` lets Meta ignore a duplicate of the same event (used for Purchase). `custom` sends it as a custom event instead of a standard one. */
export function px(event: string, data: Data = {}, opts: { eventID?: string; custom?: boolean } = {}) {
  if (!PIXEL_ID || typeof window === "undefined") return;
  const w = window as unknown as W;
  const args: unknown[] = [opts.custom ? "trackCustom" : "track", event, data];
  if (opts.eventID) args.push({ eventID: opts.eventID });
  if (w.fbq) w.fbq(...args); else (w.__pxq ??= []).push(args);
}

/** The Pixel's product fields for one or more bag lines. */
export function pxItems(lines: { productId: string; quantity: number; price: number; title?: string }[]): Data {
  return {
    content_type: "product", currency: "PKR", content_ids: lines.map((l) => l.productId), num_items: lines.reduce((s, l) => s + l.quantity, 0),
    contents: lines.map((l) => ({ id: l.productId, quantity: l.quantity, item_price: l.price })),
    value: Math.round(lines.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100,
  };
}
