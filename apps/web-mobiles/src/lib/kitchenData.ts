/**
 * Reference tables for the kitchen guides. General, widely published guidance (food-safety agencies and standard
 * cookware properties). Edit freely: the guide pages render whatever is here.
 */
export interface Material {
  id: string; name: string; summary: string;
  /** 1 (low) to 5 (high). */
  heatResponse: number; heatRetention: number; weight: number; upkeep: number; durability: number; price: number;
  induction: "yes" | "no" | "check"; dishwasher: "yes" | "no" | "check"; ovenSafe: "yes" | "no" | "check";
  goodFor: string; watchOut: string;
}

export const MATERIALS: Material[] = [
  { id: "stainless", name: "Stainless steel", summary: "Tough, non-reactive and easy to live with. Look for an aluminium or copper core for even heat.", heatResponse: 3, heatRetention: 3, weight: 3, upkeep: 2, durability: 5, price: 3, induction: "check", dishwasher: "yes", ovenSafe: "yes", goodFor: "Searing, sauces, everyday cooking", watchOut: "Food can stick unless the pan is hot and oiled; plain thin steel heats unevenly." },
  { id: "cast-iron", name: "Cast iron", summary: "Heavy and slow to heat, then holds heat for a very long time. Lasts generations when seasoned.", heatResponse: 1, heatRetention: 5, weight: 5, upkeep: 4, durability: 5, price: 2, induction: "yes", dishwasher: "no", ovenSafe: "yes", goodFor: "Searing, frying, baking, slow braising", watchOut: "Needs seasoning and drying after washing or it rusts; very heavy." },
  { id: "enamelled-cast-iron", name: "Enamelled cast iron", summary: "Cast-iron performance with a glassy coating, so no seasoning and no rust.", heatResponse: 1, heatRetention: 5, weight: 5, upkeep: 2, durability: 4, price: 5, induction: "yes", dishwasher: "check", ovenSafe: "yes", goodFor: "Stews, soups, bread, slow cooking", watchOut: "The enamel can chip if knocked; expensive." },
  { id: "carbon-steel", name: "Carbon steel", summary: "Like cast iron but lighter and quicker to react. A favourite for high-heat cooking.", heatResponse: 4, heatRetention: 3, weight: 3, upkeep: 4, durability: 5, price: 2, induction: "yes", dishwasher: "no", ovenSafe: "yes", goodFor: "Stir-frying, searing, omelettes", watchOut: "Needs seasoning and drying; can discolour (harmless)." },
  { id: "non-stick", name: "Non-stick coated", summary: "Eggs and delicate fish slide out and cleaning takes seconds.", heatResponse: 4, heatRetention: 2, weight: 2, upkeep: 2, durability: 2, price: 2, induction: "check", dishwasher: "check", ovenSafe: "check", goodFor: "Eggs, pancakes, fish, low-fat cooking", watchOut: "The coating wears over a few years; avoid metal tools and empty-pan overheating." },
  { id: "ceramic", name: "Ceramic coated", summary: "A PTFE-free non-stick look. Great at first, but the slick finish fades faster than classic non-stick.", heatResponse: 4, heatRetention: 2, weight: 2, upkeep: 3, durability: 2, price: 3, induction: "check", dishwasher: "check", ovenSafe: "check", goodFor: "Light cooking at medium heat", watchOut: "Use low to medium heat and soft tools to keep the coating." },
  { id: "copper", name: "Copper", summary: "The most responsive metal: heat up and cool down almost instantly.", heatResponse: 5, heatRetention: 2, weight: 4, upkeep: 5, durability: 4, price: 5, induction: "no", dishwasher: "no", ovenSafe: "check", goodFor: "Delicate sauces, sugar work, precise control", watchOut: "Needs polishing; expensive; usually lined with tin or steel." },
  { id: "aluminium", name: "Aluminium", summary: "Light and quick to heat evenly. Anodised versions are tougher and less reactive.", heatResponse: 5, heatRetention: 2, weight: 1, upkeep: 2, durability: 2, price: 1, induction: "no", dishwasher: "check", ovenSafe: "check", goodFor: "Everyday pots, budget cookware, baking trays", watchOut: "Soft and dents; plain aluminium reacts with acidic food; not for induction unless it has a steel base." },
  { id: "glass", name: "Borosilicate glass", summary: "See what you are cooking, no flavour transfer, goes from oven to table.", heatResponse: 2, heatRetention: 3, weight: 3, upkeep: 1, durability: 2, price: 2, induction: "no", dishwasher: "yes", ovenSafe: "yes", goodFor: "Baking, roasting, storage, microwave", watchOut: "Breaks if shocked by sudden temperature change or dropped." },
];

export interface TempRow { food: string; c: number | [number, number]; note?: string }
export interface TempGroup { id: string; title: string; intro?: string; rows: TempRow[] }

export const TEMPERATURES: TempGroup[] = [
  { id: "safe", title: "Safe internal temperatures", intro: "Measure the thickest part with a food thermometer. These are the minimums food-safety agencies recommend.", rows: [
    { food: "Chicken, turkey, duck (whole or pieces)", c: 74 },
    { food: "Minced or ground beef, lamb, pork", c: 71 },
    { food: "Beef, lamb or pork steaks, chops, roasts", c: 63, note: "then rest for 3 minutes" },
    { food: "Fish and shellfish", c: 63 },
    { food: "Egg dishes (omelettes, quiches)", c: 71 },
    { food: "Leftovers and reheated food", c: 74 },
  ] },
  { id: "steak", title: "Steak doneness", rows: [
    { food: "Rare", c: [49, 52] }, { food: "Medium rare", c: [54, 57] }, { food: "Medium", c: [60, 63] }, { food: "Medium well", c: [66, 68] }, { food: "Well done", c: [71, 76] },
  ] },
  { id: "oven", title: "Oven settings", rows: [
    { food: "Slow", c: [140, 150] }, { food: "Moderate", c: [175, 180] }, { food: "Moderately hot", c: [190, 200] }, { food: "Hot", c: [210, 220] }, { food: "Very hot", c: [230, 245] },
  ] },
  { id: "oil", title: "Frying and water", rows: [
    { food: "Deep-frying oil", c: [175, 190] }, { food: "Shallow-frying (medium-high)", c: [160, 180] }, { food: "Simmering water", c: [85, 95] }, { food: "Boiling water (at sea level)", c: 100 },
  ] },
  { id: "sugar", title: "Sugar stages", rows: [
    { food: "Soft ball (fudge)", c: [112, 116] }, { food: "Firm ball (caramels)", c: [118, 120] }, { food: "Hard ball (nougat)", c: [121, 130] }, { food: "Soft crack (toffee)", c: [132, 143] }, { food: "Hard crack (brittle)", c: [149, 154] },
  ] },
  { id: "storage", title: "Storage", rows: [
    { food: "Fridge (at or below)", c: 5 }, { food: "Freezer (at or below)", c: -18 }, { food: "Bread, fully baked (inside)", c: [93, 99] },
  ] },
];
