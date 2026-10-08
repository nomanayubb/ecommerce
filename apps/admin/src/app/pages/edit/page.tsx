"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface Field { key: string; label: string; type: string; options?: { value: string; label: string }[]; min?: number; max?: number; help?: string; maxLength?: number }
interface BlockDef { type: string; label: string; max: number; fields: Field[]; defaults: Record<string, any> }
interface Def { type: string; label: string; group: string; description: string; fields: Field[]; defaults: Record<string, any>; block?: BlockDef }
interface Block { id: string; type: string; settings: Record<string, any> }
interface Section { id: string; type: string; enabled: boolean; settings: Record<string, any>; blocks: Block[] }
interface Version { id: string; label: string | null; created_at: string }

const STORE = process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const input = "w-full rounded border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";
const btn = "rounded border border-line px-3 py-1.5 text-xs transition hover:border-accent hover:text-accent disabled:opacity-40";

const toLocal = (iso: string) => { if (!iso) return ""; const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function FieldInput({ f, value, onChange, cats, prods }: { f: Field; value: any; onChange: (v: any) => void; cats: { slug: string; name: string }[]; prods: { slug: string; title: string }[] }) {
  switch (f.type) {
    case "textarea": return <textarea className={input} rows={3} maxLength={f.maxLength ?? 2000} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "number": return <input type="number" className={input} min={f.min} max={f.max} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />;
    case "toggle": return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> On</label>;
    case "select": return <select className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
    case "category": return <select className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">All products</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>;
    case "product": return <select className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Choose a product…</option>{prods.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}</select>;
    case "color": return <input type="color" className="h-10 w-full rounded border border-line bg-card" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} />;
    case "datetime": return <input type="datetime-local" className={input} value={toLocal(value)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")} />;
    case "url": return <input className={input} placeholder="/products  or  https://…" maxLength={500} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    default: return <input className={input} maxLength={f.maxLength ?? 200} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

function Fields({ fields, values, set, cats, prods }: { fields: Field[]; values: Record<string, any>; set: (k: string, v: any) => void; cats: { slug: string; name: string }[]; prods: { slug: string; title: string }[] }) {
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <label key={f.key} className="block text-xs text-muted">
          <span className="mb-1 block font-medium uppercase tracking-widest">{f.label}</span>
          <FieldInput f={f} value={values[f.key]} onChange={(v) => set(f.key, v)} cats={cats} prods={prods} />
          {f.help && <span className="mt-1 block text-[0.7rem] opacity-80">{f.help}</span>}
        </label>
      ))}
    </div>
  );
}

function Editor() {
  const key = useSearchParams().get("key") ?? "home";
  const [defs, setDefs] = useState<Def[]>([]);
  const [meta, setMeta] = useState<{ published: boolean; versions: Version[]; sameAsDraft: boolean } | null>(null);
  const [title, setTitle] = useState("");
  const [seo, setSeo] = useState({ title: "", description: "" });
  const [sections, setSections] = useState<Section[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [cats, setCats] = useState<{ slug: string; name: string }[]>([]);
  const [prods, setProds] = useState<{ slug: string; title: string }[]>([]);
  const [presets, setPresets] = useState<{ id: string; name: string; type: string; content: { settings: any; blocks: Block[] } }[]>([]);
  const [addType, setAddType] = useState("");
  const drag = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, item, c, p, pr] = await Promise.all([
        api<{ sections: Def[] }>("/admin/section-schemas"),
        api<any>(`/admin/templates/item?key=${encodeURIComponent(key)}`),
        fetch(`${API_BASE}/categories/tree`).then((r) => r.json()).catch(() => []),
        api<any[]>("/admin/products?status=PUBLISHED").catch(() => []),
        api<any[]>("/admin/section-presets").catch(() => []),
      ]);
      const flat = (n: any[]): { slug: string; name: string }[] => n.flatMap((x) => [{ slug: x.slug, name: x.name }, ...flat(x.children ?? [])]);
      setDefs(d.sections); setCats(flat(c)); setProds(p.map((x) => ({ slug: x.slug, title: x.title }))); setPresets(pr);
      setTitle(item.title); setSeo({ title: item.seo?.title ?? "", description: item.seo?.description ?? "" });
      setSections(item.draft.sections); setSel(item.draft.sections[0]?.id ?? null); setDirty(false);
      setMeta({ published: !!item.published, versions: item.versions, sameAsDraft: item.publishedSameAsDraft });
      setAddType(d.sections[0]?.type ?? "");
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not load page" }); }
  }, [key]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const defOf = (type: string) => defs.find((d) => d.type === type);
  const edit = (fn: (s: Section[]) => Section[]) => { setSections(fn); setDirty(true); };
  const cur = sections.find((s) => s.id === sel) ?? null;
  const curDef = cur ? defOf(cur.type) : undefined;

  const move = (from: number, to: number) => { if (from === to || from == null) return; edit((s) => { const a = [...s]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; }); };
  const add = () => {
    const d = defOf(addType); if (!d) return;
    const s: Section = { id: `${d.type}-${uid()}`, type: d.type, enabled: true, settings: { ...d.defaults }, blocks: [] };
    edit((a) => [...a, s]); setSel(s.id);
  };
  const dup = (s: Section) => { const n: Section = { ...JSON.parse(JSON.stringify(s)), id: `${s.type}-${uid()}` }; n.blocks = n.blocks.map((b) => ({ ...b, id: `b-${uid()}` })); edit((a) => { const i = a.findIndex((x) => x.id === s.id); const c = [...a]; c.splice(i + 1, 0, n); return c; }); setSel(n.id); };
  const patch = (id: string, fn: (s: Section) => Section) => edit((a) => a.map((s) => (s.id === id ? fn(s) : s)));

  async function save(quiet = false) {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ sections: Section[] }>(`/admin/templates/item?key=${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify({ title, sections, seo }) });
      setSections(r.sections); setDirty(false);
      if (!quiet) setMsg({ ok: true, text: "Draft saved" });
      return true;
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save" }); return false; }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!(await save(true))) return;
    setBusy(true);
    try {
      await api(`/admin/templates/publish?key=${encodeURIComponent(key)}`, { method: "POST", body: JSON.stringify({ label: "Published from editor" }) });
      setMsg({ ok: true, text: "Published. The store shows it within about 30 seconds." }); await load();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not publish" }); }
    finally { setBusy(false); }
  }
  async function preview() {
    if (dirty && !(await save(true))) return;
    try {
      const { token } = await api<{ token: string }>(`/admin/templates/preview-token?key=${encodeURIComponent(key)}`, { method: "POST" });
      window.open(`${STORE}/preview?key=${encodeURIComponent(key)}&t=${encodeURIComponent(token)}`, "_blank", "noopener");
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not open preview" }); }
  }
  async function restore(id: string) {
    if (!id || !confirm("Restore this version into your draft? Unsaved changes will be replaced. It goes live only when you publish.")) return;
    try { await api(`/admin/templates/rollback?key=${encodeURIComponent(key)}`, { method: "POST", body: JSON.stringify({ versionId: id }) }); await load(); setMsg({ ok: true, text: "Version restored into the draft. Publish to make it live." }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not restore" }); }
  }
  async function savePreset() {
    if (!cur) return; const name = prompt("Name this preset"); if (!name) return;
    try { await api("/admin/section-presets", { method: "POST", body: JSON.stringify({ name, section: cur }) }); setPresets(await api<any[]>("/admin/section-presets")); setMsg({ ok: true, text: "Preset saved" }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save preset" }); }
  }

  if (!defs.length || !meta) return <p className="text-muted">{msg?.text ?? "Loading…"}</p>;
  const groups = Array.from(new Set(defs.map((d) => d.group)));
  const typePresets = cur ? presets.filter((p) => p.type === cur.type) : [];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/pages" className="text-xs uppercase tracking-widest text-muted hover:text-accent">← Pages</Link>
        <input aria-label="Page title" className={`${input} max-w-xs font-semibold`} value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
        <span className="text-xs uppercase tracking-widest text-muted">{dirty ? "Unsaved changes" : meta.published ? (meta.sameAsDraft ? "Published" : "Draft differs from live") : "Not published"}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {meta.versions.length > 0 && (
            <select aria-label="Restore a version" className={`${input} !w-auto !py-1.5 text-xs`} value="" onChange={(e) => restore(e.target.value)}>
              <option value="">Versions…</option>{meta.versions.map((v) => <option key={v.id} value={v.id}>{new Date(v.created_at).toLocaleString()} {v.label ? `· ${v.label}` : ""}</option>)}
            </select>
          )}
          <button className={btn} onClick={preview} disabled={busy}>Preview</button>
          <button className={btn} onClick={() => save()} disabled={busy || !dirty}>Save draft</button>
          <button className="rounded bg-brand px-4 py-1.5 text-xs font-semibold text-onbrand disabled:opacity-40" onClick={publish} disabled={busy}>Publish</button>
        </div>
      </div>
      {msg && <p role="status" className={`mb-3 text-sm ${msg.ok ? "text-accent" : "text-red-500"}`}>{msg.text}</p>}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* ---- section list */}
        <div>
          <ul className="space-y-1.5" aria-label="Sections">
            {sections.map((s, i) => (
              <li
                key={s.id} draggable
                onDragStart={() => (drag.current = i)} onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }} onDragLeave={() => setOverIdx(null)}
                onDrop={() => { move(drag.current as number, i); drag.current = null; setOverIdx(null); }} onDragEnd={() => setOverIdx(null)}
                className={`flex items-center gap-2 rounded border bg-card px-2 py-2 text-sm ${sel === s.id ? "border-accent" : "border-line"} ${overIdx === i ? "outline outline-1 outline-accent" : ""} ${s.enabled ? "" : "opacity-50"}`}
              >
                <span className="cursor-grab select-none px-1 text-muted" title="Drag to reorder" aria-hidden>⋮⋮</span>
                <button className="min-w-0 flex-1 truncate text-left" onClick={() => setSel(s.id)}>{defOf(s.type)?.label ?? s.type}{s.settings.heading ? <span className="text-muted"> · {String(s.settings.heading).slice(0, 22)}</span> : null}</button>
                <button className={btn} aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
                <button className={btn} aria-label="Move down" disabled={i === sections.length - 1} onClick={() => move(i, i + 1)}>↓</button>
              </li>
            ))}
          </ul>
          {sections.length === 0 && <p className="rounded border border-dashed border-line p-4 text-sm text-muted">No sections yet. Add one below.</p>}
          <div className="mt-4 flex gap-2">
            <select aria-label="Section to add" className={`${input} flex-1`} value={addType} onChange={(e) => setAddType(e.target.value)}>
              {groups.map((g) => <optgroup key={g} label={g}>{defs.filter((d) => d.group === g).map((d) => <option key={d.type} value={d.type}>{d.label}</option>)}</optgroup>)}
            </select>
            <button className="rounded bg-brand px-4 text-sm font-medium text-onbrand" onClick={add}>Add</button>
          </div>
          {defOf(addType) && <p className="mt-2 text-xs text-muted">{defOf(addType)!.description}</p>}

          {key !== "home" && (
            <details className="mt-6 rounded border border-line bg-card p-3 text-sm">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest">Search engine listing</summary>
              <label className="mt-3 block text-xs text-muted">Title<input className={`${input} mt-1`} maxLength={120} value={seo.title} onChange={(e) => { setSeo({ ...seo, title: e.target.value }); setDirty(true); }} /></label>
              <label className="mt-3 block text-xs text-muted">Description<textarea className={`${input} mt-1`} rows={3} maxLength={300} value={seo.description} onChange={(e) => { setSeo({ ...seo, description: e.target.value }); setDirty(true); }} /></label>
            </details>
          )}
        </div>

        {/* ---- settings for the selected section */}
        <div>
          {cur && curDef ? (
            <div className="rounded border border-line bg-card p-5">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <h2 className="mr-auto text-lg font-semibold">{curDef.label}</h2>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={cur.enabled} onChange={(e) => patch(cur.id, (s) => ({ ...s, enabled: e.target.checked }))} /> Visible</label>
                <button className={btn} onClick={() => dup(cur)}>Duplicate</button>
                <button className={btn} onClick={savePreset}>Save as preset</button>
                <button className={`${btn} hover:!border-red-500 hover:!text-red-500`} onClick={() => { if (confirm("Delete this section?")) { const i = sections.findIndex((s) => s.id === cur.id); edit((a) => a.filter((s) => s.id !== cur.id)); setSel(sections[i + 1]?.id ?? sections[i - 1]?.id ?? null); } }}>Delete</button>
              </div>
              {typePresets.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="uppercase tracking-widest text-muted">Apply preset</span>
                  <select aria-label="Apply preset" className={`${input} !w-auto !py-1.5 text-xs`} value="" onChange={(e) => { const p = typePresets.find((x) => x.id === e.target.value); if (p) patch(cur.id, (s) => ({ ...s, settings: { ...s.settings, ...p.content.settings }, blocks: (p.content.blocks ?? []).map((b) => ({ ...b, id: `b-${uid()}` })) })); }}>
                    <option value="">Choose…</option>{typePresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button className="text-muted hover:text-red-500" onClick={async () => { const id = prompt("Type the exact preset name to delete"); const p = typePresets.find((x) => x.name === id); if (p) { await api(`/admin/section-presets?id=${p.id}`, { method: "DELETE" }); setPresets(await api<any[]>("/admin/section-presets")); } }}>Delete a preset…</button>
                </div>
              )}
              <Fields fields={curDef.fields} values={cur.settings} cats={cats} prods={prods} set={(k, v) => patch(cur.id, (s) => ({ ...s, settings: { ...s.settings, [k]: v } }))} />

              {curDef.block && (
                <div className="mt-8">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest">{curDef.block.label}s ({cur.blocks.length}/{curDef.block.max})</h3>
                  <ul className="space-y-3">
                    {cur.blocks.map((b, bi) => (
                      <li key={b.id} className="rounded border border-line p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs"><span className="mr-auto font-semibold uppercase tracking-widest text-muted">{curDef.block!.label} {bi + 1}</span>
                          <button className={btn} aria-label="Move up" disabled={bi === 0} onClick={() => patch(cur.id, (s) => { const a = [...s.blocks]; [a[bi - 1], a[bi]] = [a[bi], a[bi - 1]]; return { ...s, blocks: a }; })}>↑</button>
                          <button className={btn} aria-label="Move down" disabled={bi === cur.blocks.length - 1} onClick={() => patch(cur.id, (s) => { const a = [...s.blocks]; [a[bi + 1], a[bi]] = [a[bi], a[bi + 1]]; return { ...s, blocks: a }; })}>↓</button>
                          <button className={`${btn} hover:!border-red-500 hover:!text-red-500`} onClick={() => patch(cur.id, (s) => ({ ...s, blocks: s.blocks.filter((x) => x.id !== b.id) }))}>Remove</button>
                        </div>
                        <Fields fields={curDef.block!.fields} values={b.settings} cats={cats} prods={prods} set={(k, v) => patch(cur.id, (s) => ({ ...s, blocks: s.blocks.map((x) => (x.id === b.id ? { ...x, settings: { ...x.settings, [k]: v } } : x)) }))} />
                      </li>
                    ))}
                  </ul>
                  <button className={`${btn} mt-3`} disabled={cur.blocks.length >= curDef.block.max} onClick={() => patch(cur.id, (s) => ({ ...s, blocks: [...s.blocks, { id: `b-${uid()}`, type: curDef.block!.type, settings: { ...curDef.block!.defaults } }] }))}>+ Add {curDef.block.label.toLowerCase()}</button>
                  {curDef.type === "testimonials" && <p className="mt-3 text-xs text-muted">Only add quotes from real customers. Invented reviews mislead shoppers and can break advertising rules.</p>}
                </div>
              )}
            </div>
          ) : <p className="rounded border border-dashed border-line p-8 text-center text-muted">Select a section to edit it, or add a new one.</p>}
        </div>
      </div>
    </>
  );
}

export default function EditPage() {
  return <Suspense fallback={<p className="text-muted">Loading…</p>}><Editor /></Suspense>;
}
