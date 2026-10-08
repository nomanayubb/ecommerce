/**
 * Section library: the single source of truth for page sections.
 * - The admin editor builds its forms from these definitions (GET /admin/section-schemas).
 * - The API validates/sanitises everything it stores against them.
 * - The storefront renders by `type` (apps/web/src/components/sections).
 * To add a section: define it here, then add a renderer in the web app.
 */
export type FieldType = "text" | "textarea" | "number" | "select" | "toggle" | "color" | "url" | "category" | "product" | "datetime";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  default?: string | number | boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  maxLength?: number;
  help?: string;
}
export interface BlockDef { type: string; label: string; max: number; fields: Field[] }
export interface SectionDef {
  type: string;
  label: string;
  group: "Hero & banners" | "Products" | "Content" | "Engagement";
  description: string;
  fields: Field[];
  block?: BlockDef;
}

const t = (key: string, label: string, def = "", extra: Partial<Field> = {}): Field => ({ key, label, type: "text", default: def, ...extra });
const ta = (key: string, label: string, def = "", extra: Partial<Field> = {}): Field => ({ key, label, type: "textarea", default: def, ...extra });
const url = (key: string, label: string, def = "", extra: Partial<Field> = {}): Field => ({ key, label, type: "url", default: def, ...extra });
const sel = (key: string, label: string, options: [string, string][], def: string): Field => ({ key, label, type: "select", default: def, options: options.map(([value, l]) => ({ value, label: l })) });
const num = (key: string, label: string, def: number, min: number, max: number): Field => ({ key, label, type: "number", default: def, min, max });
const tog = (key: string, label: string, def = true): Field => ({ key, label, type: "toggle", default: def });

const ICONS: [string, string][] = [["truck", "Delivery"], ["cash", "Cash"], ["shield", "Secure"], ["support", "Support"], ["package", "Package"], ["star", "Star"], ["heart", "Heart"]];

export const SECTIONS: SectionDef[] = [
  {
    type: "hero", label: "Hero banner", group: "Hero & banners", description: "Large opening banner: animated gradient, full image, or split image + text.",
    fields: [
      sel("variant", "Style", [
        ["gradient", "Animated gradient + line art"], ["image", "Full image"], ["split", "Split: text + image"], ["video", "Video background"],
        ["kinetic", "Kinetic typography (rotating words)"], ["parallax", "Parallax layers"], ["floating", "Floating hand-drawn doodles"],
        ["scene3d", "3D kitchen scene (interactive)"], ["compare", "Before / after slider"], ["mascot", "Mascot tells the story"],
      ], "gradient"),
      t("eyebrow", "Small heading", "", { help: "Empty = store name" }),
      t("heading", "Headline", "", { help: "Empty = store tagline", maxLength: 120 }),
      ta("text", "Text", "", { help: "Empty = hero text from Brand & theme", maxLength: 300 }),
      t("primaryLabel", "Main button label", "Shop the collection"), url("primaryHref", "Main button link", "/products"),
      t("secondaryLabel", "Second button label", "Best prices"), url("secondaryHref", "Second button link", "/products?sort=price_asc"),
      url("imageUrl", "Image", "", { help: "Used by Image, Split, Parallax and as the Before photo of Before / after" }),
      url("imageUrl2", "Second image", "", { help: "After photo for Before / after" }),
      url("videoUrl", "Video file (.mp4 / .webm)", "", { help: "Used by the Video style; the Image above is shown while it loads" }),
      t("rotatingWords", "Rotating words", "", { help: "Kinetic style: comma separated, e.g. Kitchen, Style, Tech", maxLength: 120 }),
      ta("storyLines", "Mascot story lines", "", { help: "Mascot style: one short line per row", maxLength: 600 }),
      sel("particles", "Floating particles", [["none", "None"], ["flour", "Flour dust"], ["spices", "Spices"], ["steam", "Steam"], ["herbs", "Herbs"], ["sparkles", "Gold sparkles"]], "none"),
      tog("magnetic", "Main button leans toward the cursor", false),
      sel("height", "Height", [["md", "Medium"], ["lg", "Large"]], "lg"),
    ],
  },
  {
    type: "collection-list", label: "Category tiles", group: "Products", description: "Bento grid of your top-level categories.",
    fields: [t("eyebrow", "Small heading", "Explore"), t("heading", "Heading", "Shop by category"), num("count", "How many", 5, 2, 8)],
  },
  {
    type: "featured-collection", label: "Product grid", group: "Products", description: "A grid of products, optionally from one category.",
    fields: [
      t("eyebrow", "Small heading", "Just in"), t("heading", "Heading", "New arrivals"),
      { key: "categorySlug", label: "Category", type: "category", default: "", help: "Empty = all products" },
      num("count", "How many", 8, 2, 24), sel("columns", "Columns", [["2", "2"], ["3", "3"], ["4", "4"]], "4"),
      sel("sort", "Order", [["newest", "Newest"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"]], "newest"),
      tog("showViewAll", "Show 'View all' link"),
    ],
  },
  {
    type: "product-carousel", label: "Product carousel", group: "Products", description: "Swipeable row of products.",
    fields: [t("eyebrow", "Small heading", ""), t("heading", "Heading", "Bestsellers"), { key: "categorySlug", label: "Category", type: "category", default: "" }, num("count", "How many", 8, 3, 16)],
  },
  {
    type: "product-spotlight", label: "Product spotlight", group: "Products", description: "One hero product with image gallery and buy box.",
    fields: [t("eyebrow", "Small heading", "Featured"), t("heading", "Heading", "Spotlight"), { key: "productSlug", label: "Product", type: "product", default: "" }],
  },
  {
    type: "image-with-text", label: "Image with text", group: "Content", description: "Image beside text, or text over the image.",
    fields: [
      sel("layout", "Layout", [["left", "Image left"], ["right", "Image right"], ["overlay", "Text over image"]], "left"),
      url("imageUrl", "Image", ""), t("eyebrow", "Small heading", ""), t("heading", "Heading", "Our story"), ta("text", "Text", "", { maxLength: 1200 }),
      t("buttonLabel", "Button label", ""), url("buttonHref", "Button link", ""),
    ],
  },
  {
    type: "rich-text", label: "Text block", group: "Content", description: "Heading and paragraphs. Blank line = new paragraph.",
    fields: [sel("align", "Alignment", [["left", "Left"], ["center", "Centre"]], "center"), t("eyebrow", "Small heading", ""), t("heading", "Heading", ""), ta("body", "Text", "", { maxLength: 4000 })],
  },
  {
    type: "multicolumn", label: "Columns with icons", group: "Content", description: "Up to 6 short columns (delivery, quality, support…).",
    fields: [t("heading", "Heading", ""), sel("columns", "Columns per row", [["2", "2"], ["3", "3"], ["4", "4"]], "3")],
    block: { type: "column", label: "Column", max: 6, fields: [sel("icon", "Icon", ICONS, "package"), t("title", "Title", "Title"), ta("text", "Text", "", { maxLength: 300 })] },
  },
  {
    type: "testimonials", label: "Customer quotes", group: "Engagement", description: "Real customer quotes only. Do not invent reviews.",
    fields: [t("eyebrow", "Small heading", "Customers"), t("heading", "Heading", "What people say")],
    block: { type: "quote", label: "Quote", max: 9, fields: [ta("quote", "Quote", "", { maxLength: 400 }), t("name", "Name", ""), t("role", "Detail (city, product…)", "")] },
  },
  {
    type: "logo-bar", label: "Brand / logo bar", group: "Engagement", description: "Row of brand or partner names or logos.",
    fields: [t("heading", "Heading", "As seen with")],
    block: { type: "logo", label: "Logo", max: 12, fields: [t("name", "Name", ""), url("imageUrl", "Logo image", ""), url("href", "Link", "")] },
  },
  {
    type: "faq", label: "FAQ", group: "Content", description: "Questions and answers in an accordion.",
    fields: [t("eyebrow", "Small heading", "Help"), t("heading", "Heading", "Frequently asked questions")],
    block: { type: "question", label: "Question", max: 20, fields: [t("question", "Question", "", { maxLength: 200 }), ta("answer", "Answer", "", { maxLength: 1200 })] },
  },
  {
    type: "countdown-banner", label: "Sale banner with countdown", group: "Engagement", description: "Banner counting down to a date you choose.",
    fields: [
      t("eyebrow", "Small heading", "Limited time"), t("heading", "Heading", "Sale ends soon"), ta("text", "Text", "", { maxLength: 300 }),
      { key: "endsAt", label: "Ends at", type: "datetime", default: "" }, t("expiredText", "Text after it ends", "This offer has ended."),
      t("buttonLabel", "Button label", "Shop now"), url("buttonHref", "Button link", "/products"),
    ],
  },
  { type: "newsletter", label: "Newsletter signup", group: "Engagement", description: "Email signup box.", fields: [t("heading", "Heading", "Be the first to know"), ta("text", "Text", "New arrivals and offers, straight to your inbox.", { maxLength: 300 })] },
  { type: "recently-viewed", label: "Recently viewed", group: "Products", description: "Products the visitor looked at (hidden when empty).", fields: [t("heading", "Heading", "Recently viewed")] },
  {
    type: "promise", label: "Brand promise (3D logo)", group: "Engagement", description: "Statement with the interactive 3D logo.",
    fields: [t("eyebrow", "Small heading", "", { help: "Empty = 'The <store> promise'" }), ta("text", "Statement", "", { help: "Empty = promise text from Brand & theme", maxLength: 400 }), tog("show3dLogo", "Show the 3D logo")],
  },
  { type: "spacer", label: "Spacer", group: "Content", description: "Empty vertical space.", fields: [num("height", "Height (px)", 48, 8, 240)] },
];

export const SECTION_BY_TYPE = new Map(SECTIONS.map((s) => [s.type, s]));

export interface SectionInstance { id: string; type: string; enabled: boolean; settings: Record<string, string | number | boolean>; blocks: { id: string; type: string; settings: Record<string, string | number | boolean> }[] }

const SLUG = /^[a-z0-9-]*$/;
const rid = () => Math.random().toString(36).slice(2, 10);

export function defaultsOf(fields: Field[]) {
  return Object.fromEntries(fields.map((f) => [f.key, f.default ?? (f.type === "number" ? (f.min ?? 0) : f.type === "toggle" ? false : "")]));
}

function cleanValue(f: Field, v: unknown): string | number | boolean {
  const d = (f.default ?? (f.type === "number" ? (f.min ?? 0) : f.type === "toggle" ? false : "")) as string | number | boolean;
  switch (f.type) {
    case "toggle": return typeof v === "boolean" ? v : d;
    case "number": { const n = Number(v); return Number.isFinite(n) ? Math.min(f.max ?? 1e9, Math.max(f.min ?? -1e9, Math.round(n))) : d; }
    case "select": return typeof v === "string" && f.options?.some((o) => o.value === v) ? v : d;
    case "color": return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "";
    case "url": { const s = typeof v === "string" ? v.trim().slice(0, 500) : ""; return s === "" || (s.startsWith("/") && !s.startsWith("//")) || /^https?:\/\//i.test(s) ? s : ""; }
    case "category": case "product": { const s = typeof v === "string" ? v.trim().slice(0, 100) : ""; return SLUG.test(s) ? s : ""; }
    case "datetime": { if (typeof v !== "string" || !v) return ""; const dt = new Date(v); return Number.isNaN(dt.getTime()) ? "" : dt.toISOString(); }
    case "textarea": return typeof v === "string" ? v.slice(0, f.maxLength ?? 2000) : "";
    default: return typeof v === "string" ? v.slice(0, f.maxLength ?? 200) : "";
  }
}

const dflt = (f: Field) => (f.default ?? (f.type === "number" ? (f.min ?? 0) : f.type === "toggle" ? false : "")) as string | number | boolean;

/** A field that is ABSENT takes its default; a value the owner cleared on purpose (empty string) stays empty. */
const cleanFields = (fields: Field[], raw: unknown) => {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(fields.map((f) => [f.key, r[f.key] === undefined ? dflt(f) : cleanValue(f, r[f.key])]));
};

/** Validates a page's sections; unknown types are rejected, unknown settings are dropped. */
export function sanitizeSections(input: unknown): SectionInstance[] {
  if (!Array.isArray(input)) throw Object.assign(new Error("sections must be a list"), { statusCode: 400 });
  if (input.length > 40) throw Object.assign(new Error("A page can have at most 40 sections"), { statusCode: 400 });
  const seen = new Set<string>();
  return input.map((raw: any) => {
    const def = SECTION_BY_TYPE.get(String(raw?.type));
    if (!def) throw Object.assign(new Error(`Unknown section type: ${String(raw?.type).slice(0, 40)}`), { statusCode: 400 });
    let id = typeof raw.id === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(raw.id) ? raw.id : `${def.type}-${rid()}`;
    while (seen.has(id)) id = `${def.type}-${rid()}`;
    seen.add(id);
    const blocks = def.block && Array.isArray(raw.blocks)
      ? raw.blocks.slice(0, def.block.max).map((b: any) => ({ id: typeof b?.id === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(b.id) ? b.id : `b-${rid()}`, type: def.block!.type, settings: cleanFields(def.block!.fields, b?.settings) }))
      : [];
    return { id, type: def.type, enabled: raw.enabled !== false, settings: cleanFields(def.fields, raw.settings), blocks } as SectionInstance;
  });
}

export const newSection = (type: string): SectionInstance => {
  const def = SECTION_BY_TYPE.get(type)!;
  return { id: `${type}-${rid()}`, type, enabled: true, settings: defaultsOf(def.fields) as SectionInstance["settings"], blocks: [] };
};

/** What the home page shows until the owner publishes their own layout. Mirrors the original hard-coded home. */
export const DEFAULT_HOME: SectionInstance[] = sanitizeSections([
  { id: "hero-1", type: "hero", settings: {} },
  { id: "cats-1", type: "collection-list", settings: {} },
  { id: "new-1", type: "featured-collection", settings: {} },
  { id: "recent-1", type: "recently-viewed", settings: {} },
  { id: "promise-1", type: "promise", settings: { show3dLogo: true } },
]);
