"use client";

import { ContentList } from "@/components/ContentList";

export default function Bundles() {
  return <ContentList title="Curated bundles" path="bundles" editBase="/bundles/edit" intro="Hand-picked sets of products that shoppers add to their bag in one tap. Shown at /bundles on the shop." extra={(r) => `${r.item_count} products`} />;
}
