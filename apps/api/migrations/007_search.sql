-- Popular searches (powers "trending") — one row per normalised query.
CREATE TABLE IF NOT EXISTS search_queries (
  q TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 1,
  last_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_queries_hits_idx ON search_queries (hits DESC, last_at DESC);
-- Fast ILIKE on product titles for suggestions.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS products_title_trgm ON products USING gin (title gin_trgm_ops);
