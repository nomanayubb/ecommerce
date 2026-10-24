"use client";

import { SearchPicker } from "./SearchPicker";

/** City box for the checkout: the shared searchable picker with the big cities first and the short names people use. See SearchPicker for how the search works. */
// Major cities, biggest first (2017 census order, rounded; the first ten match the OpenStreetMap population figures). When someone searches, these come first among the matches
// and everything else follows A to Z; with nothing typed the whole list is A to Z. TCS spellings.
const MAJOR = [
  "KARACHI", "LAHORE", "FAISALABAD", "RAWALPINDI", "GUJRANWALA", "PESHAWAR", "MULTAN", "HYDERABAD", "ISLAMABAD", "QUETTA",
  "BAHAWALPUR", "SARGODAH", "SIALKOT", "SUKKUR", "LARKANA", "SHEIKHUPURA", "RAHIMYARKHAN", "JHANG", "DERA GHAZI KHAN", "GUJRAT",
  "SAHIWAL", "WAH", "MARDAN", "KASUR", "OKARA", "MINGORA", "NAWABSHAH", "CHINIOT", "KOTRI", "KAMOKE",
  "HAFIZABAD", "SADIQABAD", "MIRPUR KHAS", "BUREWALA", "KOHAT", "KHANEWAL", "DERA ISMAIL KHAN", "TURBAT", "MUZAFFARGARH", "MANDI BAHAUDDIN",
  "SHIKARPUR", "ABBOTABAD", "JHELUM", "KHANPUR",
];
const ALIASES: Record<string, string> = {
  khi: "KARACHI", lhr: "LAHORE", isb: "ISLAMABAD", pindi: "RAWALPINDI", rwp: "RAWALPINDI", fsd: "FAISALABAD", lyallpur: "FAISALABAD", mtn: "MULTAN", pwr: "PESHAWAR",
  hyd: "HYDERABAD", sargodha: "SARGODAH", gwadar: "GAWADAR", ryk: "RAHIMYARKHAN", "rahim yar khan": "RAHIMYARKHAN", "dg khan": "DERA GHAZI KHAN", dgk: "DERA GHAZI KHAN",
  "di khan": "DERA ISMAIL KHAN", dik: "DERA ISMAIL KHAN", muzaffarabad: "MUZAFFARABAD AK", kotli: "KOTLI-A.KASHMIR", abbottabad: "ABBOTABAD", nowshera: "NOWSHERA", swat: "SWAT",
};

export function CityPicker({ cities, value, onChange, required, className }: { cities: string[]; value: string; onChange: (city: string) => void; required?: boolean; className?: string }) {
  return (
    <SearchPicker
      items={cities} value={value} onChange={onChange} required={required} className={className} name="city"
      placeholder="Type to search your city" rank={MAJOR} aliases={ALIASES} invalidMessage="Please choose your city from the list"
      hint={(_n, total) => `All ${total} cities, A to Z. Type to search`}
      noMatch={(q) => `No city matches “${q}”. Check the spelling or try a nearby big city.`}
    />
  );
}
