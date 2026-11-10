"use client";

import { useEffect, useState } from "react";
import { TruckIcon } from "./icons";

// Working-day estimates by city group. Editable here until courier APIs (TCS/Leopard) are connected.
const METROS = ["Karachi", "Lahore", "Islamabad", "Rawalpindi"];
const OTHERS = ["Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Other city"];

/** Skips Sundays. Orders placed after 5pm start counting the next day. */
function addWorkingDays(from: Date, days: number) {
  const d = new Date(from);
  if (d.getHours() >= 17) d.setDate(d.getDate() + 1);
  let left = days;
  while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) left--; }
  return d;
}
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export function DeliveryEstimate() {
  const [city, setCity] = useState("");
  useEffect(() => { try { setCity(localStorage.getItem("city") ?? ""); } catch {} }, []);
  const pick = (c: string) => { setCity(c); try { localStorage.setItem("city", c); } catch {} };
  const range = city ? (METROS.includes(city) ? [2, 3] : [3, 5]) : null;
  const now = new Date();

  return (
    <div className="border border-line p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <TruckIcon size={20} />
        <label className="eyebrow !text-[0.65rem]" htmlFor="city">Estimated delivery</label>
        <select id="city" value={city} onChange={(e) => pick(e.target.value)} className="min-w-40 flex-1 border border-line bg-card px-3 py-2 text-sm">
          <option value="">Choose your city</option>
          <optgroup label="Main cities">{METROS.map((c) => <option key={c}>{c}</option>)}</optgroup>
          <optgroup label="Other">{OTHERS.map((c) => <option key={c}>{c}</option>)}</optgroup>
        </select>
      </div>
      {range && <p className="mt-3 text-muted">Arrives <strong className="text-fg">{fmt(addWorkingDays(now, range[0]))} – {fmt(addWorkingDays(now, range[1]))}</strong> ({range[0]}–{range[1]} working days). Estimate only.</p>}
    </div>
  );
}
