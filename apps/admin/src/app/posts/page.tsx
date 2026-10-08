"use client";

import { ContentList } from "@/components/ContentList";

export default function Posts() {
  return <ContentList title="Blog posts" path="posts" editBase="/posts/edit" intro="Articles shown at /blog on the shop." extra={(r) => (r.featured ? "featured" : "")} />;
}
