"use client";

import { SearchPicker } from "./SearchPicker";

/** City box for the checkout: the shared searchable picker with the big cities first and the short names people use. See SearchPicker for how the search works. */
const POPULAR = ["KARACHI", "LAHORE", "ISLAMABAD", "RAWALPINDI", "FAISALABAD", "MULTAN", "PESHAWAR", "QUETTA", "HYDERABAD", "GUJRANWALA", "SIALKOT", "SARGODAH"];
const ALIASES: Record<string, string> = {
  khi: "KARACHI", lhr: "LAHORE", isb: "ISLAMABAD", pindi: "RAWALPINDI", rwp: "RAWALPINDI", fsd: "FAISALABAD", lyallpur: "FAISALABAD", mtn: "MULTAN", pwr: "PESHAWAR",
  hyd: "HYDERABAD", sargodha: "SARGODAH", gwadar: "GAWADAR", ryk: "RAHIMYARKHAN", "rahim yar khan": "RAHIMYARKHAN", "dg khan": "DERA GHAZI KHAN", dgk: "DERA GHAZI KHAN",
  "di khan": "DERA ISMAIL KHAN", dik: "DERA ISMAIL KHAN", muzaffarabad: "MUZAFFARABAD AK", kotli: "KOTLI-A.KASHMIR", abbottabad: "ABBOTABAD", nowshera: "NOWSHERA", swat: "SWAT",
};

export function CityPicker({ cities, value, onChange, required, className }: { cities: string[]; value: string; onChange: (city: string) => void; required?: boolean; className?: string }) {
  return (
    <SearchPicker
      items={cities} value={value} onChange={onChange} required={required} className={className} name="city"
      placeholder="Type to search your city" popular={POPULAR} aliases={ALIASES} invalidMessage="Please choose your city from the list"
      hint={(_n, total) => `Popular cities, or type to search all ${total}`}
      noMatch={(q) => `No city matches “${q}”. Check the spelling or try a nearby big city.`}
    />
  );
}
