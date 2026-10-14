-- Pictures uploaded from the admin (product import, product editor). Served at /uploads/<name>.
CREATE TABLE IF NOT EXISTS uploads (
  name TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
