"use client";

import { useState } from "react";

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === "left" ? "M14.5 6l-6 6 6 6" : "M9.5 6l6 6-6 6"} />
  </svg>
);
const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); }; // the card is a link: the arrows must not open the product

/**
 * The product picture inside the card's frame, with left and right arrows to flip through the product's other photos. The arrows show only
 * when the pointer is on the card (always on touch screens); until then the card looks exactly as it did with a single picture.
 */
export function CardPhoto({ images, alt, priority, soldOut }: { images: string[]; alt: string; priority?: boolean; soldOut?: boolean }) {
  const [i, setI] = useState(0);
  const list = images.filter(Boolean);
  if (!list.length) return null;
  const go = (d: number) => setI((n) => (n + d + list.length) % list.length);
  return (
    <>
      <img
        key={i} src={list[i]} alt={alt} loading={priority || i > 0 ? "eager" : "lazy"} fetchPriority={priority && i === 0 ? "high" : undefined} decoding="async" width={600} height={750}
        className={`pcard-photo relative ${soldOut ? "opacity-50 grayscale" : ""}`}
      />
      {list.length > 1 && !soldOut && (
        <>
          <button type="button" aria-label="Previous photo" onClick={(e) => { stop(e); go(-1); }} className="card-arrow left-1.5"><Chevron dir="left" /></button>
          <button type="button" aria-label="Next photo" onClick={(e) => { stop(e); go(1); }} className="card-arrow right-1.5"><Chevron dir="right" /></button>
          <span aria-live="polite" className="sr-only">Photo {i + 1} of {list.length}</span>
        </>
      )}
    </>
  );
}
