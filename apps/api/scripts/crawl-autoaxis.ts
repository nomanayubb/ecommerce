// Resumable, polite crawler for autoaxis.pk part pages (/parts/<id>). Reads each id from --from to --to, keeps ONLY products that are in stock, and appends one JSON line per product to
// apps/api/data/autoaxis/parts.ndjson (git-ignored). Progress is saved in progress.json, so a stopped run continues where it stopped.
//   npx tsx scripts/crawl-autoaxis.ts [--from 1] [--to 125000] [--workers 4] [--delay 150] [--tag name] [--sitemap]
// Fields: id, name, price (what the shop charges the buyer there), was (price before discount), sku, image, description, seller, inStock, url.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const opt = (k: string, d: number) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const FROM = opt("from", 1), TO = opt("to", 125000), WORKERS = opt("workers", 4), DELAY = opt("delay", 150);
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/autoaxis");
fs.mkdirSync(DIR, { recursive: true });
const TAG = process.argv.includes("--tag") ? process.argv[process.argv.indexOf("--tag") + 1] : "";   // several crawlers can run on different id ranges, each with its own tag
const OUT = path.join(DIR, `parts${TAG ? "-" + TAG : ""}.ndjson`), PROG = path.join(DIR, `progress${TAG ? "-" + TAG : ""}.json`);
const UA = "Mozilla/5.0 (compatible; AVERIXA-catalogue-import)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;|&lsquo;/g, "'").replace(/&ndash;/g, "-").replace(/&mdash;/g, "-").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

// done[id] = 1 checked (kept or skipped), so a restart never repeats work
const done = new Set<number>(fs.existsSync(PROG) ? (JSON.parse(fs.readFileSync(PROG, "utf8")) as { done: number[] }).done : []);
const saveProg = () => fs.writeFileSync(PROG, JSON.stringify({ done: [...done] }));
let kept = 0, skippedOut = 0, missing = 0, errors = 0, blocked = 0;

async function one(id: number) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`https://autoaxis.pk/parts/${id}`, { headers: { "user-agent": UA }, redirect: "manual", signal: AbortSignal.timeout(45000) });
      if (r.status === 404 || r.status === 301 || r.status === 302 || r.status === 410) { missing++; return; }
      if (r.status === 403 || r.status === 429) { blocked++; await sleep(15000 * (t + 1)); continue; }
      if (!r.ok) { await sleep(1500 * (t + 1)); continue; }
      const h = await r.text();
      const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((x) => /"@type":\s*"Product"/.test(x));
      if (!ld) { missing++; return; }
      const p = JSON.parse(ld);
      const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
      const inStock = /InStock/i.test(String(offer?.availability ?? ""));
      if (!inStock) { skippedOut++; return; }
      const text = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "\n");
      const was = /Price:\s*PKR\s*([\d,]+)/.exec(text.replace(/\s+/g, " "))?.[1];
      const seller = /Sold By:\s*([^\n]+?)\s*(?:Availability|\n)/i.exec(text.replace(/[ \t]+/g, " "))?.[1]?.trim() ?? /href="https:\/\/autoaxis\.pk\/store\/[^"]+"[^>]*>\s*([^<]+?)\s*</.exec(h)?.[1];
      const img = Array.isArray(p.image) ? (p.image[0]?.url ?? p.image[0]) : (p.image?.url ?? p.image);
      const price = Number(offer?.price);
      if (!(price > 0) || !img) { missing++; return; }
      fs.appendFileSync(OUT, JSON.stringify({ id, name: decode(String(p.name ?? "")), price, was: was ? Number(was.replace(/,/g, "")) : null, sku: p.sku ?? null, image: img, description: decode(String(p.description ?? "")).slice(0, 3000), seller: seller ? decode(seller) : null, url: `https://autoaxis.pk/parts/${id}` }) + "\n");
      kept++; return;
    } catch { errors++; await sleep(1500 * (t + 1)); }
  }
}

// --sitemap: crawl exactly the parts listed in the site's own parts sitemap (these are the parts that have a price)
const useSitemap = process.argv.includes("--sitemap");
let idList: number[] = [];
if (useSitemap) {
  const sm = await (await fetch("https://autoaxis.pk/sitemaps/sitemap_parts_1.xml", { headers: { "user-agent": UA } })).text();
  idList = [...sm.matchAll(/<loc>https:\/\/autoaxis\.pk\/parts\/(\d+)<\/loc>/g)].map((m) => Number(m[1]));
  console.log(`sitemap lists ${idList.length} parts`);
}
let next = FROM, processed = 0, li = 0; const t0 = Date.now();
async function worker() {
  while (useSitemap ? li < idList.length : next <= TO) {
    const id = useSitemap ? idList[li++] : next++; if (done.has(id)) continue;
    await one(id); done.add(id); processed++;
    if (processed % 200 === 0) { saveProg(); const mins = (Date.now() - t0) / 60000; console.log(`id ${id}: kept ${kept} in stock, ${skippedOut} out of stock, ${missing} not found, ${errors} errors, ${blocked} blocked | ${(processed / mins).toFixed(0)} ids/min`); }
    await sleep(DELAY);
  }
}
await Promise.all(Array.from({ length: WORKERS }, worker));
saveProg();
console.log(`finished ${FROM}-${TO}: kept ${kept} in stock, ${skippedOut} out of stock, ${missing} not found`);
