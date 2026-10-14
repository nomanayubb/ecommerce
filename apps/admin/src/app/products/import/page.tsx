"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";

const COLUMNS = ["title", "sku", "selling_price", "marked_price", "stock", "collections", "brand", "tags", "status", "description", "seo_title", "seo_description", "images"];
const EXAMPLE = [
  ["AVERIXA Steel Water Bottle 750 ml", "AVX-BOT-750", "1999", "2499", "40", "Bottles|AVERIXA", "AVERIXA", "bottle|steel", "PUBLISHED", "Insulated steel bottle that keeps drinks cold for 12 hours.", "AVERIXA Steel Water Bottle 750 ml | Buy Online in Pakistan", "Insulated 750 ml steel bottle with cash on delivery across Pakistan.", "bottle-front.jpg|bottle-side.jpg"],
  ["AVERIXA Ceramic Mug", "AVX-MUG-01", "799", "", "100", "Mugs", "AVERIXA", "mug|ceramic", "PUBLISHED", "Classic ceramic mug for tea and coffee.", "", "", "mug.jpg"],
];

/** Small CSV reader: commas, quoted cells with commas or new lines, and "" for a quote inside a cell. */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((c) => c.trim())) out.push(row); row = []; }
    else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) out.push(row);
  return out;
}
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const list = (v: string) => v.split("|").map((x) => x.trim()).filter(Boolean);
const key = (n: string) => n.trim().toLowerCase().replace(/\.jpeg$/, ".jpg").replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);

async function toWebp(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not read picture"))), "image/webp", 0.85));
  const data: string = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.readAsDataURL(blob); });
  return data;
}

type Result = { row: number; status: "created" | "updated" | "error"; message: string };

export default function ImportProducts() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [err, setErr] = useState("");

  const wanted = useMemo(() => [...new Set(rows.flatMap((r) => list(r.images ?? "")).filter((n) => !/^(https?:)?\/\//i.test(n) && !n.startsWith("/")))], [rows]);
  const fileKeys = useMemo(() => new Set(files.map((f) => key(f.name))), [files]);
  const missing = wanted.filter((n) => !fileKeys.has(key(n)));
  const problems = rows.map((r, i) => (!r.title?.trim() ? `Row ${i + 2}: title is empty` : !r.sku?.trim() ? `Row ${i + 2}: sku is empty` : !(Number(r.selling_price) >= 0) || r.selling_price === "" ? `Row ${i + 2}: selling_price is not a number` : "")).filter(Boolean);

  function template() {
    const csv = [COLUMNS, ...EXAMPLE].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "products-template.csv"; a.click();
  }
  async function readCsv(f: File | undefined) {
    setResults(null); setErr("");
    if (!f) return setRows([]);
    const table = parseCsv(await f.text());
    const head = table[0]?.map((h) => h.trim().toLowerCase()) ?? [];
    if (!head.includes("title") || !head.includes("sku")) { setRows([]); return setErr("The first row must have the column names, including title and sku. Download the template to see them."); }
    setRows(table.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()]))));
  }

  async function run() {
    setBusy(true); setErr(""); setResults(null);
    try {
      const used = new Set(wanted.map(key));
      const todo = files.filter((f) => used.has(key(f.name)));
      for (let i = 0; i < todo.length; i++) {
        setProgress(`Uploading pictures ${i + 1} of ${todo.length}`);
        await api("/admin/uploads", { method: "POST", body: JSON.stringify({ name: todo[i].name, mime: "image/webp", data: await toWebp(todo[i]) }) });
      }
      const payload = rows.map((r) => ({
        title: r.title, sku: r.sku, sellingPrice: Number(r.selling_price), markedPrice: r.marked_price ? Number(r.marked_price) : null,
        stock: r.stock ? Math.max(0, Math.round(Number(r.stock))) : 0, brand: r.brand ?? "", collections: list(r.collections ?? ""), tags: list(r.tags ?? ""),
        status: (r.status || "PUBLISHED").toUpperCase(), description: r.description ?? "", seoTitle: r.seo_title ?? "", seoDescription: r.seo_description ?? "", images: list(r.images ?? ""),
      }));
      const all: Result[] = [];
      for (let i = 0; i < payload.length; i += 100) {
        setProgress(`Creating products ${Math.min(i + 100, payload.length)} of ${payload.length}`);
        const r = await api<{ results: Result[] }>("/admin/products/import", { method: "POST", body: JSON.stringify({ rows: payload.slice(i, i + 100) }) });
        all.push(...r.results.map((x) => ({ ...x, row: x.row + i })));
      }
      setResults(all); setProgress("");
    } catch (e) { setErr(e instanceof Error ? e.message : "Import failed"); setProgress(""); }
    finally { setBusy(false); }
  }

  const box = "rounded border border-line bg-card p-5";
  const errs = results?.filter((r) => r.status === "error") ?? [];
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/products" className="text-muted hover:text-accent">← Products</Link></p>
      <h1 className="mb-2 text-2xl font-bold">Import products</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">Fill a spreadsheet with your products, pick it here together with the pictures, and everything is created at once. A row with an SKU that already exists updates that product. Only use pictures you own or have permission to use (your own photos, or ones your supplier gave you).</p>

      <div className="max-w-3xl space-y-6">
        <section className={box}>
          <h2 className="text-sm font-semibold uppercase tracking-widest">1. Get the spreadsheet</h2>
          <p className="mt-2 text-sm text-muted">Open the template in Excel or Google Sheets and replace the example rows. In the collections, tags and images columns, separate several values with a | sign. Collections are matched by name or address, so use names from the Collections tab. The first picture of a product is its main picture.</p>
          <button type="button" onClick={template} className="mt-3 rounded border border-line px-4 py-2 text-sm hover:border-accent hover:text-accent">Download the template (CSV)</button>
        </section>

        <section className={box}>
          <h2 className="text-sm font-semibold uppercase tracking-widest">2. Choose your filled spreadsheet</h2>
          <input type="file" accept=".csv,text/csv" className="mt-3 block text-sm" onChange={(e) => readCsv(e.target.files?.[0])} />
          {rows.length > 0 && <p className="mt-3 text-sm text-accent">{rows.length} product{rows.length === 1 ? "" : "s"} found.</p>}
          {problems.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-red-500">{problems.slice(0, 6).map((p) => <li key={p}>{p}</li>)}{problems.length > 6 && <li>and {problems.length - 6} more</li>}</ul>}
        </section>

        <section className={box}>
          <h2 className="text-sm font-semibold uppercase tracking-widest">3. Choose the pictures</h2>
          <p className="mt-2 text-sm text-muted">Select all the picture files at once (JPG, PNG or WebP). Their names must match the images column. They are resized to 1400 pixels and compressed for fast loading.</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-3 block text-sm" onChange={(e) => { setFiles([...(e.target.files ?? [])]); setResults(null); }} />
          {wanted.length > 0 && <p className={`mt-3 text-sm ${missing.length ? "text-red-500" : "text-accent"}`}>{wanted.length - missing.length} of {wanted.length} pictures named in the spreadsheet were found{missing.length ? `. Missing: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? " and more" : ""}` : "."}</p>}
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <button type="button" disabled={busy || !rows.length || problems.length > 0 || missing.length > 0} onClick={run} className="rounded bg-brand px-6 py-2 text-sm font-medium text-onbrand disabled:opacity-40">{busy ? "Working..." : `Import ${rows.length || ""} products`}</button>
          {progress && <span className="text-sm text-muted">{progress}</span>}
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        {results && (
          <section className={box}>
            <h2 className="text-sm font-semibold uppercase tracking-widest">Result</h2>
            <p className="mt-2 text-sm"><span className="text-accent">{results.filter((r) => r.status === "created").length} created</span>, {results.filter((r) => r.status === "updated").length} updated, <span className={errs.length ? "text-red-500" : ""}>{errs.length} with problems</span>.</p>
            {errs.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-red-500">{errs.slice(0, 30).map((r) => <li key={r.row}>Row {r.row + 1}: {r.message}</li>)}</ul>}
            <p className="mt-3 text-sm"><Link href="/products" className="text-accent hover:underline">See the products</Link></p>
          </section>
        )}
      </div>
    </>
  );
}
