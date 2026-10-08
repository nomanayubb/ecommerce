import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { limited, requireUser } from "../lib/auth.js";

/* ------------------------------------------------------------------ shared shapes */
const slug = z.string().regex(/^[a-z0-9-]{1,100}$/, "Use lowercase letters, numbers and dashes");
const url = z.string().trim().max(500).refine((v) => v === "" || /^\/[^\s]*$/.test(v) || /^https?:\/\/[^\s]+$/.test(v), "Use /path or https:// address");
const list = (max: number, len = 40) => z.array(z.string().trim().toLowerCase().min(1).max(len)).max(max).default([]);

const nutrition = z.object({ kcal: z.number().min(0).max(5000).default(0), protein: z.number().min(0).max(500).default(0), carbs: z.number().min(0).max(500).default(0), fat: z.number().min(0).max(500).default(0) });
const ingredient = z.object({
  name: z.string().trim().min(1).max(80),
  qty: z.number().min(0).max(100000).nullish().transform((v) => v ?? null),
  unit: z.string().trim().max(20).default(""),
  note: z.string().trim().max(100).default(""),
  productSlug: slug.nullish().transform((v) => v ?? null),
  pantry: z.boolean().default(false), // salt, water, oil: ignored when matching "what can I cook"
  nutrition: nutrition.nullish().transform((v) => v ?? null), // for the amount written above
});
const step = z.object({ text: z.string().trim().min(1).max(600), timerMinutes: z.number().int().min(1).max(600).nullish().transform((v) => v ?? null) });

export const recipeSchema = z.object({
  slug, title: z.string().trim().min(1).max(160), summary: z.string().trim().max(400).default(""),
  imageUrl: url.default(""), videoUrl: url.default(""),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]), prepMinutes: z.number().int().min(0).max(1440), cookMinutes: z.number().int().min(0).max(1440), servings: z.number().int().min(1).max(100),
  seasons: list(8), tags: list(12), tools: z.array(slug).max(20).default([]),
  ingredients: z.array(ingredient).max(60), steps: z.array(step).max(40), featured: z.boolean().default(false), status: z.enum(["DRAFT", "PUBLISHED"]),
});
export const postSchema = z.object({
  slug, title: z.string().trim().min(1).max(160), excerpt: z.string().trim().max(300).default(""), body: z.string().max(40000).default(""),
  coverUrl: url.default(""), authorName: z.string().trim().max(80).default(""), authorBio: z.string().trim().max(400).default(""),
  tags: list(10), featured: z.boolean().default(false), status: z.enum(["DRAFT", "PUBLISHED"]),
});
export const bundleSchema = z.object({
  slug, title: z.string().trim().min(1).max(160), description: z.string().trim().max(600).default(""), imageUrl: url.default(""), curator: z.string().trim().max(80).default(""),
  items: z.array(z.object({ slug, qty: z.number().int().min(1).max(50).default(1) })).min(1).max(20), status: z.enum(["DRAFT", "PUBLISHED"]),
});

const PRODUCT_COLS = `p.id, p.title, p.slug, p.selling_price, p.marked_price, p.stock_quantity, p.images[1] AS image, p.moq,
  EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id) AS has_variants`;
const productsBySlug = async (slugs: string[]) => {
  if (!slugs.length) return new Map<string, any>();
  const { rows } = await pool.query(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.status = 'PUBLISHED' AND p.slug = ANY($1::text[])`, [slugs]);
  return new Map(rows.map((r) => [r.slug as string, r]));
};
const RECIPE_CARD = "id, slug, title, summary, image_url, video_url, difficulty, prep_minutes, cook_minutes, servings, seasons, tags, featured";

/* ------------------------------------------------------------------ public */
export const contentRoutes: FastifyPluginAsync = async (app) => {
  const listQuery = z.object({
    q: z.string().trim().max(80).optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    season: z.string().trim().toLowerCase().max(30).optional(),
    tag: z.string().trim().toLowerCase().max(40).optional(),
    maxMinutes: z.coerce.number().int().min(1).max(1440).optional(),
    have: z.string().max(400).optional(), // ingredients the shopper has, comma separated
    sort: z.enum(["newest", "quick", "easy", "match"]).default("newest"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(12),
  });

  app.get("/recipes", async (req) => {
    const f = listQuery.parse(req.query);
    const where = ["status = 'PUBLISHED'"];
    const args: unknown[] = [];
    const add = (sql: string, v: unknown) => { args.push(v); where.push(sql.replace("?", `$${args.length}`)); };
    if (f.q) add("(title ILIKE ? OR summary ILIKE ?)", `%${f.q}%`);
    if (f.difficulty) add("difficulty = ?", f.difficulty);
    if (f.season) add("? = ANY(seasons)", f.season);
    if (f.tag) add("? = ANY(tags)", f.tag);
    if (f.maxMinutes) add("(prep_minutes + cook_minutes) <= ?", f.maxMinutes);
    const have = (f.have ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean).slice(0, 25);

    const { rows } = await pool.query(`SELECT ${RECIPE_CARD}, ingredients FROM recipes WHERE ${where.join(" AND ")} ORDER BY featured DESC, created_at DESC LIMIT 300`, args);
    let items = rows.map((r) => {
      const ing = (r.ingredients as { name: string; pantry?: boolean }[]).filter((i) => !i.pantry);
      let match: number | null = null, missing: string[] = [];
      if (have.length && ing.length) {
        const hit = (n: string) => have.some((h) => n.toLowerCase().includes(h) || h.includes(n.toLowerCase()));
        const got = ing.filter((i) => hit(i.name));
        missing = ing.filter((i) => !hit(i.name)).map((i) => i.name);
        match = Math.round((got.length / ing.length) * 100);
      }
      const { ingredients: _ignored, ...card } = r;
      return { ...card, matchPct: match, missing };
    });
    if (have.length) items = items.filter((r) => (r.matchPct ?? 0) > 0);
    const total = (r: any) => r.prep_minutes + r.cook_minutes;
    const rank = { EASY: 0, MEDIUM: 1, HARD: 2 } as Record<string, number>;
    if (f.sort === "quick") items.sort((a, b) => total(a) - total(b));
    else if (f.sort === "easy") items.sort((a, b) => rank[a.difficulty] - rank[b.difficulty] || total(a) - total(b));
    else if (f.sort === "match" || have.length) items.sort((a, b) => (b.matchPct ?? 0) - (a.matchPct ?? 0) || total(a) - total(b));
    const start = (f.page - 1) * f.pageSize;
    return { items: items.slice(start, start + f.pageSize), total: items.length, page: f.page, pageSize: f.pageSize };
  });

  app.get<{ Params: { slug: string } }>("/recipes/:slug", async (req, reply) => {
    const r = (await pool.query("SELECT * FROM recipes WHERE slug = $1 AND status = 'PUBLISHED'", [req.params.slug])).rows[0];
    if (!r) return reply.status(404).send({ success: false, error: "Not found" });
    const slugs = [...new Set<string>([...(r.ingredients as any[]).map((i) => i.productSlug).filter(Boolean), ...r.tools])];
    const prods = await productsBySlug(slugs);
    const related = (await pool.query(
      `SELECT ${RECIPE_CARD} FROM recipes WHERE status = 'PUBLISHED' AND id <> $1 AND (seasons && $2::text[] OR tags && $3::text[] OR difficulty = $4)
       ORDER BY (seasons && $2::text[]) DESC, (tags && $3::text[]) DESC, created_at DESC LIMIT 3`, [r.id, r.seasons, r.tags, r.difficulty])).rows;
    return {
      ...r,
      ingredients: (r.ingredients as any[]).map((i) => ({ ...i, product: i.productSlug ? prods.get(i.productSlug) ?? null : null })),
      toolProducts: (r.tools as string[]).map((s) => prods.get(s)).filter(Boolean),
      related,
    };
  });

  // Recipes that use a given product ("cooked with this").
  app.get<{ Params: { slug: string } }>("/products/:slug/recipes", async (req) => {
    const { rows } = await pool.query(
      `SELECT ${RECIPE_CARD.split(", ").map((c) => `r.${c}`).join(", ")} FROM recipes r
       WHERE r.status = 'PUBLISHED' AND EXISTS (SELECT 1 FROM recipe_products rp JOIN products p ON p.id = rp.product_id WHERE rp.recipe_id = r.id AND p.slug = $1)
       ORDER BY r.featured DESC, r.created_at DESC LIMIT 6`, [req.params.slug]);
    return { items: rows };
  });

  // Recipes ranked by how much of the equipment/ingredient products the signed-in shopper already bought.
  app.get("/kitchen/recipes", { preHandler: requireUser }, async (req) => {
    const owned = (await pool.query(
      `SELECT DISTINCT oi.product_id FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.user_id = $1 AND o.order_status <> 'CANCELED' AND oi.product_id IS NOT NULL`, [req.user.sub])).rows.map((r) => r.product_id);
    if (!owned.length) return { ownedCount: 0, items: [] };
    const { rows } = await pool.query(
      `SELECT ${RECIPE_CARD.split(", ").map((c) => `r.${c}`).join(", ")},
              count(*) FILTER (WHERE rp.product_id = ANY($1::uuid[]))::int AS owned_hits, count(*)::int AS linked
       FROM recipes r JOIN recipe_products rp ON rp.recipe_id = r.id
       WHERE r.status = 'PUBLISHED' GROUP BY r.id HAVING count(*) FILTER (WHERE rp.product_id = ANY($1::uuid[])) > 0
       ORDER BY owned_hits DESC, linked ASC LIMIT 24`, [owned]);
    return { ownedCount: owned.length, items: rows };
  });

  app.get("/posts", async (req) => {
    const f = z.object({ tag: z.string().trim().toLowerCase().max(40).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(30).default(9) }).parse(req.query);
    const args: unknown[] = [];
    let where = "status = 'PUBLISHED'";
    if (f.tag) { args.push(f.tag); where += ` AND $${args.length} = ANY(tags)`; }
    const total = Number((await pool.query(`SELECT count(*) FROM posts WHERE ${where}`, args)).rows[0].count);
    const { rows } = await pool.query(
      `SELECT id, slug, title, excerpt, cover_url, author_name, tags, featured, published_at FROM posts WHERE ${where} ORDER BY featured DESC, published_at DESC NULLS LAST LIMIT ${f.pageSize} OFFSET ${(f.page - 1) * f.pageSize}`, args);
    return { items: rows, total, page: f.page, pageSize: f.pageSize };
  });
  app.get<{ Params: { slug: string } }>("/posts/:slug", async (req, reply) => {
    const p = (await pool.query("SELECT * FROM posts WHERE slug = $1 AND status = 'PUBLISHED'", [req.params.slug])).rows[0];
    if (!p) return reply.status(404).send({ success: false, error: "Not found" });
    const related = (await pool.query("SELECT slug, title, cover_url, published_at FROM posts WHERE status = 'PUBLISHED' AND id <> $1 ORDER BY (tags && $2::text[]) DESC, published_at DESC NULLS LAST LIMIT 3", [p.id, p.tags])).rows;
    return { ...p, related };
  });

  const bundleWithProducts = async (b: any) => {
    const prods = await productsBySlug((b.items as { slug: string }[]).map((i) => i.slug));
    const items = (b.items as { slug: string; qty: number }[]).map((i) => ({ ...i, product: prods.get(i.slug) ?? null })).filter((i) => i.product);
    const total = items.reduce((s, i) => s + Number(i.product.selling_price) * i.qty, 0);
    return { ...b, items, total };
  };
  app.get("/bundles", async () => {
    const { rows } = await pool.query("SELECT * FROM bundles WHERE status = 'PUBLISHED' ORDER BY created_at DESC LIMIT 50");
    return { items: await Promise.all(rows.map(bundleWithProducts)) };
  });
  app.get<{ Params: { slug: string } }>("/bundles/:slug", async (req, reply) => {
    const b = (await pool.query("SELECT * FROM bundles WHERE slug = $1 AND status = 'PUBLISHED'", [req.params.slug])).rows[0];
    if (!b) return reply.status(404).send({ success: false, error: "Not found" });
    return bundleWithProducts(b);
  });

  app.post("/contact", async (req, reply) => {
    const b = z.object({
      name: z.string().trim().min(1, "Please add your name").max(100),
      email: z.string().trim().email("Please enter a valid email").max(255),
      phone: z.string().trim().max(40).optional(),
      message: z.string().trim().min(5, "Please write a few words").max(3000),
      website: z.string().max(0).optional(), // honeypot: real people leave it empty
    }).parse(req.body);
    if (limited(`contact:${req.ip}`, 4, 15 * 60_000)) return reply.status(429).send({ success: false, error: "Too many messages, please try again later" });
    await pool.query("INSERT INTO contact_messages (name, email, phone, message) VALUES ($1,$2,$3,$4)", [b.name, b.email, b.phone || null, b.message]);
    return reply.status(201).send({ success: true, message: "Thank you! We will reply by email soon." });
  });
};

/* ------------------------------------------------------------------ admin */
export const contentAdminRoutes: FastifyPluginAsync = async (app) => {
  const writer = async (req: any, reply: any) => {
    if (req.user.role === "WAREHOUSE") return reply.status(403).send({ success: false, error: "Forbidden" });
  };
  const isId = (id: string) => /^[0-9a-f-]{36}$/.test(id);
  const dup = (reply: any) => reply.status(409).send({ success: false, error: "That page address is already used" });

  // ---- recipes
  const syncRecipeProducts = async (c: { query: typeof pool.query }, id: string, r: z.infer<typeof recipeSchema>) => {
    await c.query("DELETE FROM recipe_products WHERE recipe_id = $1", [id]);
    const ing = [...new Set(r.ingredients.map((i) => i.productSlug).filter(Boolean) as string[])];
    if (ing.length) await c.query("INSERT INTO recipe_products SELECT $1, p.id, 'ingredient' FROM products p WHERE p.slug = ANY($2::text[]) ON CONFLICT DO NOTHING", [id, ing]);
    if (r.tools.length) await c.query("INSERT INTO recipe_products SELECT $1, p.id, 'tool' FROM products p WHERE p.slug = ANY($2::text[]) ON CONFLICT DO NOTHING", [id, r.tools]);
  };
  const recipeArgs = (r: z.infer<typeof recipeSchema>) => [r.slug, r.title, r.summary, r.imageUrl, r.videoUrl, r.difficulty, r.prepMinutes, r.cookMinutes, r.servings, r.seasons, r.tags, r.tools, JSON.stringify(r.ingredients), JSON.stringify(r.steps), r.featured, r.status];

  app.get("/recipes", async () => (await pool.query("SELECT id, slug, title, difficulty, status, featured, prep_minutes, cook_minutes, created_at FROM recipes ORDER BY created_at DESC LIMIT 200")).rows);
  app.get<{ Params: { id: string } }>("/recipes/:id", async (req, reply) => {
    const r = isId(req.params.id) ? (await pool.query("SELECT * FROM recipes WHERE id = $1", [req.params.id])).rows[0] : null;
    if (!r) return reply.status(404).send({ success: false, error: "Not found" });
    return { id: r.id, slug: r.slug, title: r.title, summary: r.summary, imageUrl: r.image_url, videoUrl: r.video_url, difficulty: r.difficulty, prepMinutes: r.prep_minutes, cookMinutes: r.cook_minutes, servings: r.servings, seasons: r.seasons, tags: r.tags, tools: r.tools, ingredients: r.ingredients, steps: r.steps, featured: r.featured, status: r.status };
  });
  app.post("/recipes", { preHandler: writer }, async (req, reply) => {
    const r = recipeSchema.parse(req.body);
    try {
      const row = (await pool.query(
        `INSERT INTO recipes (slug, title, summary, image_url, video_url, difficulty, prep_minutes, cook_minutes, servings, seasons, tags, tools, ingredients, steps, featured, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`, recipeArgs(r))).rows[0];
      await syncRecipeProducts(pool, row.id, r);
      return reply.status(201).send({ id: row.id });
    } catch (e: any) { if (e.code === "23505") return dup(reply); throw e; }
  });
  app.put<{ Params: { id: string } }>("/recipes/:id", { preHandler: writer }, async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    const r = recipeSchema.parse(req.body);
    try {
      const res = await pool.query(
        `UPDATE recipes SET slug=$2, title=$3, summary=$4, image_url=$5, video_url=$6, difficulty=$7, prep_minutes=$8, cook_minutes=$9, servings=$10, seasons=$11, tags=$12, tools=$13, ingredients=$14, steps=$15, featured=$16, status=$17, updated_at=now() WHERE id=$1`,
        [req.params.id, ...recipeArgs(r)]);
      if (!res.rowCount) return reply.status(404).send({ success: false, error: "Not found" });
      await syncRecipeProducts(pool, req.params.id, r);
      return { success: true };
    } catch (e: any) { if (e.code === "23505") return dup(reply); throw e; }
  });
  app.delete<{ Params: { id: string } }>("/recipes/:id", { preHandler: writer }, async (req) => { if (isId(req.params.id)) await pool.query("DELETE FROM recipes WHERE id = $1", [req.params.id]); return { success: true }; });

  // ---- posts
  const postArgs = (p: z.infer<typeof postSchema>) => [p.slug, p.title, p.excerpt, p.body, p.coverUrl, p.authorName, p.authorBio, p.tags, p.featured, p.status];
  app.get("/posts", async () => (await pool.query("SELECT id, slug, title, status, featured, published_at, created_at FROM posts ORDER BY created_at DESC LIMIT 200")).rows);
  app.get<{ Params: { id: string } }>("/posts/:id", async (req, reply) => {
    const p = isId(req.params.id) ? (await pool.query("SELECT * FROM posts WHERE id = $1", [req.params.id])).rows[0] : null;
    if (!p) return reply.status(404).send({ success: false, error: "Not found" });
    return { id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, coverUrl: p.cover_url, authorName: p.author_name, authorBio: p.author_bio, tags: p.tags, featured: p.featured, status: p.status };
  });
  app.post("/posts", { preHandler: writer }, async (req, reply) => {
    const p = postSchema.parse(req.body);
    try {
      const row = (await pool.query(
        `INSERT INTO posts (slug, title, excerpt, body, cover_url, author_name, author_bio, tags, featured, status, published_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CASE WHEN $10 = 'PUBLISHED' THEN now() END) RETURNING id`, postArgs(p))).rows[0];
      return reply.status(201).send({ id: row.id });
    } catch (e: any) { if (e.code === "23505") return dup(reply); throw e; }
  });
  app.put<{ Params: { id: string } }>("/posts/:id", { preHandler: writer }, async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    const p = postSchema.parse(req.body);
    try {
      const res = await pool.query(
        `UPDATE posts SET slug=$2, title=$3, excerpt=$4, body=$5, cover_url=$6, author_name=$7, author_bio=$8, tags=$9, featured=$10, status=$11,
           published_at = CASE WHEN $11 = 'PUBLISHED' THEN coalesce(published_at, now()) ELSE published_at END, updated_at=now() WHERE id=$1`,
        [req.params.id, ...postArgs(p)]);
      if (!res.rowCount) return reply.status(404).send({ success: false, error: "Not found" });
      return { success: true };
    } catch (e: any) { if (e.code === "23505") return dup(reply); throw e; }
  });
  app.delete<{ Params: { id: string } }>("/posts/:id", { preHandler: writer }, async (req) => { if (isId(req.params.id)) await pool.query("DELETE FROM posts WHERE id = $1", [req.params.id]); return { success: true }; });

  // ---- bundles
  const bundleArgs = (b: z.infer<typeof bundleSchema>) => [b.slug, b.title, b.description, b.imageUrl, b.curator, JSON.stringify(b.items), b.status];
  app.get("/bundles", async () => (await pool.query("SELECT id, slug, title, status, jsonb_array_length(items) AS item_count, created_at FROM bundles ORDER BY created_at DESC LIMIT 100")).rows);
  app.get<{ Params: { id: string } }>("/bundles/:id", async (req, reply) => {
    const b = isId(req.params.id) ? (await pool.query("SELECT * FROM bundles WHERE id = $1", [req.params.id])).rows[0] : null;
    if (!b) return reply.status(404).send({ success: false, error: "Not found" });
    return { id: b.id, slug: b.slug, title: b.title, description: b.description, imageUrl: b.image_url, curator: b.curator, items: b.items, status: b.status };
  });
  app.post("/bundles", { preHandler: writer }, async (req, reply) => {
    const b = bundleSchema.parse(req.body);
    try {
      const row = (await pool.query("INSERT INTO bundles (slug, title, description, image_url, curator, items, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id", bundleArgs(b))).rows[0];
      return reply.status(201).send({ id: row.id });
    } catch (e: any) { if (e.code === "23505") return dup(reply); throw e; }
  });
  app.put<{ Params: { id: string } }>("/bundles/:id", { preHandler: writer }, async (req, reply) => {
    if (!isId(req.params.id)) return reply.status(404).send({ success: false, error: "Not found" });
    const b = bundleSchema.parse(req.body);
    try {
      const res = await pool.query("UPDATE bundles SET slug=$2, title=$3, description=$4, image_url=$5, curator=$6, items=$7, status=$8 WHERE id=$1", [req.params.id, ...bundleArgs(b)]);
      if (!res.rowCount) return reply.status(404).send({ success: false, error: "Not found" });
      return { success: true };
    } catch (e: any) { if (e.code === "23505") return dup(reply); throw e; }
  });
  app.delete<{ Params: { id: string } }>("/bundles/:id", { preHandler: writer }, async (req) => { if (isId(req.params.id)) await pool.query("DELETE FROM bundles WHERE id = $1", [req.params.id]); return { success: true }; });

  // ---- contact inbox
  app.get("/messages", async (req) => {
    const { status } = z.object({ status: z.enum(["NEW", "DONE"]).optional() }).parse(req.query);
    return (await pool.query("SELECT id, name, email, phone, message, status, created_at FROM contact_messages WHERE ($1::text IS NULL OR status = $1) ORDER BY created_at DESC LIMIT 200", [status ?? null])).rows;
  });
  app.patch<{ Params: { id: string } }>("/messages/:id", { preHandler: writer }, async (req, reply) => {
    const { status } = z.object({ status: z.enum(["NEW", "DONE"]) }).parse(req.body);
    const r = isId(req.params.id) ? await pool.query("UPDATE contact_messages SET status = $2 WHERE id = $1", [req.params.id, status]) : { rowCount: 0 };
    if (!r.rowCount) return reply.status(404).send({ success: false, error: "Not found" });
    return { success: true };
  });
};
