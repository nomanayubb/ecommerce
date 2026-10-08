-- Initial AVERIXA branding. Merges over the generic defaults; admin edits afterwards are unaffected on re-runs (migrations run once).
UPDATE site_settings SET value = value || '{
  "name": "AVERIXA",
  "tagline": "Your world. Our store.",
  "logoUrl": "/brand/logo-horizontal.webp",
  "logoUrlDark": "/brand/logo-horizontal-dark.webp",
  "brandColor": "#1c1c1e",
  "brandColorDark": "#d4aa46",
  "accentColor": "#b88c2c",
  "radius": 2,
  "font": "system",
  "defaultTheme": "dark",
  "announcement": "Free delivery over Rs. 5,000  ·  Cash on delivery across Pakistan"
}'::jsonb, updated_at = now() WHERE key = 'branding';
