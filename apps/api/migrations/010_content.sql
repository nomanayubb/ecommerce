-- Recipes, blog posts, curated bundles and contact messages.
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'EASY' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  prep_minutes INTEGER NOT NULL DEFAULT 10 CHECK (prep_minutes >= 0),
  cook_minutes INTEGER NOT NULL DEFAULT 20 CHECK (cook_minutes >= 0),
  servings INTEGER NOT NULL DEFAULT 4 CHECK (servings >= 1),
  seasons TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  tools TEXT[] NOT NULL DEFAULT '{}',
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recipes_status_idx ON recipes (status, featured DESC, created_at DESC);

-- Which products a recipe uses (ingredients or equipment); kept in sync when a recipe is saved. Powers "cooked with" on products.
CREATE TABLE IF NOT EXISTS recipe_products (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'ingredient' CHECK (role IN ('ingredient', 'tool')),
  PRIMARY KEY (recipe_id, product_id, role)
);
CREATE INDEX IF NOT EXISTS recipe_products_product_idx ON recipe_products (product_id);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  author_bio TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts (status, published_at DESC);

CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  curator TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 5 AND 3000),
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'DONE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
