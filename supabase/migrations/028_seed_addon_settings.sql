-- 028_seed_addon_settings.sql

-- Add addon prices to site_settings
INSERT INTO site_settings (id, value, description)
VALUES
('addon_price_deep_clean', '200', 'Additional price for Deep Clean service upgrade'),
('addon_price_eco_products', '150', 'Additional price for using Eco-friendly products'),
('addon_price_urgent', '300', 'Additional price for Urgent / Priority service'),
('addon_price_weekend', '500', 'Additional price for Weekend service requests')
ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;
