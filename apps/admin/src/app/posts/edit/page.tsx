"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { csv, field, lab, slugify } from "@/components/ContentList";

interface Post { slug: string; title: string; excerpt: string; body: string; coverUrl: string; authorName: string; authorBio: string; tags: string[]; featured: boolean; status: "DRAFT" | "PUBLISHED" }
const BLANK: Post = { slug: "", title: "", excerpt: "", body: "", coverUrl: "", authorName: "", authorBio: "", tags: [], featured: false, status: "DRAFT" };

function Editor() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const [p, setP] = useState<Post>(BLANK);
  const [tags, setTags] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id || id === "new") return;
    api<Post>(`/admin/posts/${id}`).then((x) => { setP(x); setTags(x.tags.join(", ")); }).catch((e) => setMsg({ ok: false, text: e.message }));
  }, [id]);
  const set = <K extends keyof Post>(k: K, v: Post[K]) => setP((c) => ({ ...c, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const body = { ...p, slug: p.slug || slugify(p.title), tags: csv(tags) };
    try {
      if (id === "new") { const res = await api<{ id: string }>("/admin/posts", { method: "POST", body: JSON.stringify(body) }); router.replace(`/posts/edit?id=${res.id}`); }
      else await api(`/admin/posts/${id}`, { method: "PUT", body: JSON.stringify(body) });
      setMsg({ ok: true, text: "Saved." });
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed" }); }
    setBusy(false);
  }
  return (
    <form onSubmit={save} className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3"><h1 className="mr-auto text-2xl font-bold">{id === "new" ? "New post" : "Edit post"}</h1><Link href="/posts" className="text-sm underline">Back</Link><button disabled={busy} className="rounded bg-brand px-6 py-2 text-sm font-medium text-onbrand disabled:opacity-50">{busy ? "Saving..." : "Save"}</button></div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</p>}
      <label className={lab}>Title<input required className={field} value={p.title} onChange={(e) => set("title", e.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={lab}>Page address<input pattern="[a-z0-9-]+" className={field} placeholder="auto from title" value={p.slug} onChange={(e) => set("slug", e.target.value)} /></label>
        <label className={lab}>Cover photo address<input className={field} value={p.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} /></label>
        <label className={lab}>Status<select className={field} value={p.status} onChange={(e) => set("status", e.target.value as Post["status"])}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
      </div>
      <label className={lab}>Short summary (shown on cards)<textarea rows={2} maxLength={300} className={field} value={p.excerpt} onChange={(e) => set("excerpt", e.target.value)} /></label>
      <label className={lab}>
        Article text. A blank line starts a new paragraph. Start a line with <code># </code> for a heading, <code>## </code> for a smaller heading, <code>- </code> for bullet points, or write <code>![description](/photo-address)</code> alone on a line for a photo.
        <textarea rows={16} className={field} value={p.body} onChange={(e) => set("body", e.target.value)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={lab}>Author name<input className={field} value={p.authorName} onChange={(e) => set("authorName", e.target.value)} /></label>
        <label className={lab}>Tags, comma separated<input className={field} value={tags} onChange={(e) => setTags(e.target.value)} /></label>
      </div>
      <label className={lab}>About the author (short bio shown under the article)<textarea rows={2} maxLength={400} className={field} value={p.authorBio} onChange={(e) => set("authorBio", e.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.featured} onChange={(e) => set("featured", e.target.checked)} />Feature this post (shown first)</label>
    </form>
  );
}
export default function EditPost() {
  return <Suspense fallback={<p className="text-muted">Loading...</p>}><Editor /></Suspense>;
}
