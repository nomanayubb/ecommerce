-- JSON page templates (section-based pages), version history, reusable section presets.
CREATE TABLE page_templates (
  key TEXT PRIMARY KEY,                       -- 'home' or 'page:<slug>'
  title TEXT NOT NULL,
  draft JSONB NOT NULL DEFAULT '{"sections": []}'::jsonb,
  published JSONB,                            -- NULL = never published (home falls back to the built-in default)
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,     -- {title, description}
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL REFERENCES page_templates(key) ON DELETE CASCADE,
  content JSONB NOT NULL,
  label TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_template_versions_key ON template_versions(key, created_at DESC);

CREATE TABLE section_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  type VARCHAR(40) NOT NULL,
  content JSONB NOT NULL,                     -- {settings, blocks}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_section_presets_type ON section_presets(type);
