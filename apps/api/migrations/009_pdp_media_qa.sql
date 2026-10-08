-- Colour swatch -> gallery image (index into products.images).
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_index INTEGER;

-- Customer questions on product pages. Shown only after the shop approves them; answers come from staff.
CREATE TABLE IF NOT EXISTS product_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(80) NOT NULL,
  question TEXT NOT NULL CHECK (length(question) BETWEEN 5 AND 500),
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'HIDDEN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS product_qa_product_idx ON product_qa (product_id, status, created_at DESC);
