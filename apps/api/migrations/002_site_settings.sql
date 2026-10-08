CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_settings (key, value) VALUES ('branding', '{
  "name": "Store",
  "tagline": "",
  "logoUrl": "",
  "brandColor": "#4f46e5",
  "brandColorDark": "#818cf8",
  "radius": 8,
  "font": "system",
  "defaultTheme": "light",
  "announcement": ""
}'::jsonb);
