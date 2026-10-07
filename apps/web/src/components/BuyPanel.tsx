"use client";

import { useMemo, useState } from "react";
import { pkr, type ProductDetail } from "@/lib/api";
import { useCart } from "./CartProvider";

export function BuyPanel({ p }: { p: ProductDetail }) {
  const { add } = useCart();
  const [variantId, setVariantId] = useState<string | null>(p.variants[0]?.id ?? null);
  const [qty, setQty] = useState(Math.max(1, p.moq));

  const variant = p.variants.find((v) => v.id === variantId);
  const stock = variant ? variant.stock_quantity : p.stock_quantity;
  const unit = useMemo(() => {
    let price = Number(variant ? variant.price : p.selling_price);
    for (const t of p.priceTiers) if (qty >= t.min_qty) price = Math.min(price, Number(t.unit_price));
    return price;
  }, [variant, qty, p]);

  return (
    <div className="space-y-4">
      <p className="text-2xl font-semibold">
        {pkr(unit)}{" "}
        {p.discount_pct && <span className="text-base text-muted line-through">{pkr(p.marked_price)}</span>}
      </p>

      {p.variants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {p.variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setVariantId(v.id)}
              disabled={v.stock_quantity === 0}
              className={`rounded border px-3 py-1 text-sm disabled:opacity-40 ${v.id === variantId ? "border-brand bg-brand/10" : "border-line"}`}
            >
              {v.title}
            </button>
          ))}
        </div>
      )}

      {p.priceTiers.length > 0 && (
        <table className="w-full max-w-xs text-sm">
          <thead><tr className="text-left text-muted"><th>Qty</th><th>Unit price</th></tr></thead>
          <tbody>
            {p.priceTiers.map((t) => (
              <tr key={t.min_qty}><td>{t.min_qty}+</td><td>{pkr(t.unit_price)}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {stock > 0 && stock <= 5 && <p className="text-sm text-orange-500">Only {stock} left in stock</p>}

      <div className="flex gap-3">
        <input
          type="number" min={p.moq} max={stock || undefined} value={qty}
          onChange={(e) => setQty(Math.max(p.moq, Number(e.target.value) || p.moq))}
          className="w-20 rounded border border-line bg-card px-2"
        />
        <button
          disabled={stock === 0 || qty > stock}
          onClick={() => add({ productId: p.id, variantId, title: variant ? `${p.title} - ${variant.title}` : p.title, price: unit, image: p.images[0], quantity: qty })}
          className="flex-1 rounded bg-brand py-3 font-medium text-white disabled:opacity-50"
        >
          {stock === 0 ? "Out of stock" : "Add to cart"}
        </button>
      </div>
      {p.moq > 1 && <p className="text-xs text-muted">Minimum order quantity: {p.moq}</p>}
    </div>
  );
}
