-- Migration 044: Fix lowercase city names and clean up test accounts
-- This migration:
-- 1. Capitalizes city names in users and taskers tables
-- 2. Removes "Live Pro" test account if present

-- Helper function to capitalize first letter of each word
CREATE OR REPLACE FUNCTION capitalize_city(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN INITCAP(TRIM(name));
END;
$$ LANGUAGE plpgsql;

-- Fix city names in users table
UPDATE public.users
SET city = capitalize_city(city)
WHERE city IS NOT NULL AND city != '' AND city != capitalize_city(city);

-- Fix city names in taskers table
UPDATE public.taskers
SET city = capitalize_city(city)
WHERE city IS NOT NULL AND city != '' AND city != capitalize_city(city);

-- Remove "Live Pro" test account from taskers table
DELETE FROM public.taskers
WHERE user_id IN (
  SELECT id FROM public.users
  WHERE full_name ILIKE '%Live Pro%'
);

-- Remove "Live Pro" test account from users table
DELETE FROM public.users
WHERE full_name ILIKE '%Live Pro%';

-- Drop the helper function
DROP FUNCTION IF EXISTS capitalize_city(TEXT);
