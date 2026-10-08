-- Palette + editable copy for the brand kit, and commerce rules moved out of code.
UPDATE site_settings SET value = value || '{
  "inkColor": "#1e1e20",
  "creamColor": "#faf6ee",
  "darkColor": "#0f0f11",
  "heroText": "Considered products, honest prices, delivered to your door across Pakistan. Pay when it arrives.",
  "promiseText": "Every order is checked, packed with care and sent with tracking. If it is not right, we make it right.",
  "footerText": "Curated products, honest prices and delivery you can count on."
}'::jsonb, updated_at = now() WHERE key = 'branding';
INSERT INTO site_settings (key, value) VALUES ('store', '{"freeShippingThreshold": 5000, "shippingFee": 250}'::jsonb) ON CONFLICT (key) DO NOTHING;
