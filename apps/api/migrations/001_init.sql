
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN','ADMIN','WAREHOUSE','CUSTOMER','WHOLESALE');
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100), last_name VARCHAR(100), phone VARCHAR(50),
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  is_wholesale BOOLEAN NOT NULL DEFAULT FALSE,
  wholesale_status VARCHAR(50) NOT NULL DEFAULT 'NONE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT, image_url VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url VARCHAR(500), description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  marked_price NUMERIC(12,2) NOT NULL, selling_price NUMERIC(12,2) NOT NULL,
  wholesale_price NUMERIC(12,2),
  sku VARCHAR(100) UNIQUE NOT NULL, barcode VARCHAR(100),
  is_digital BOOLEAN NOT NULL DEFAULT FALSE,
  model_3d_url VARCHAR(500),
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  moq INT NOT NULL DEFAULT 1,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  metafields JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE product_categories (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL, sku VARCHAR(100) UNIQUE NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  variant_attributes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty INT NOT NULL, unit_price NUMERIC(12,2) NOT NULL,
  UNIQUE (product_id, min_qty)
);

CREATE TYPE order_status AS ENUM ('PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELED','REFUNDED');
CREATE TYPE payment_status AS ENUM ('UNPAID','PAID','FAILED','REFUNDED');
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  shipping_address JSONB NOT NULL, billing_address JSONB NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL,
  order_status order_status NOT NULL DEFAULT 'PENDING',
  payment_status payment_status NOT NULL DEFAULT 'UNPAID',
  payment_method VARCHAR(50) NOT NULL,
  payment_gateway_reference VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL, sku VARCHAR(100) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL, quantity INT NOT NULL CHECK (quantity > 0),
  total_price NUMERIC(12,2) NOT NULL
);

CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT FALSE,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  css_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_code_overrides TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_theme ON themes (is_active) WHERE is_active;

CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_metafields ON products USING GIN(metafields);
CREATE INDEX idx_variants_attributes ON product_variants USING GIN(variant_attributes);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(order_status);
