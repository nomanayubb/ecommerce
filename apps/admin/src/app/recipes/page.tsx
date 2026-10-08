"use client";

import { ContentList } from "@/components/ContentList";

export default function Recipes() {
  return <ContentList title="Recipes" path="recipes" editBase="/recipes/edit" intro="Recipes link your products (ingredients and equipment) so shoppers can add everything to their bag. Published recipes appear at /recipes on the shop." extra={(r) => `${r.difficulty} · ${Number(r.prep_minutes) + Number(r.cook_minutes)} min${r.featured ? " · featured" : ""}`} />;
}
