-- 024_admin_nocode_controls.sql

-- 1. Add Verification Pillars & Feedback Loop to Taskers
ALTER TABLE taskers
ADD COLUMN IF NOT EXISTS is_id_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_background_checked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_gear_certified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Ensure site_settings table exists (Should exist from 019, but making sure)
-- Assuming it exists, let's insert the critical no-code business rules
INSERT INTO site_settings (id, value, description)
VALUES
  ('platform_commission_rate', '0.10', 'Global platform commission rate (e.g. 0.10 for 10%)'),
  ('enable_live_tracking', 'true', 'Enable or disable live map tracking for customers'),
  ('emergency_support_number', '+977-9800000000', 'Phone number displayed for SOS/Concierge Support'),
  ('auto_abandon_draft_minutes', '30', 'Minutes before a draft booking is considered abandoned')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description;
