-- Migration 045: Add slug column to services table for SEO-friendly URLs
-- Created for: SewaKhoj Service Page SEO Fix

-- 1. Add slug column
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Backfill slugs from name column (lowercase, hyphenated, alphanumeric only)
UPDATE public.services
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- 3. Handle duplicate slugs by appending suffix
UPDATE public.services s1
SET slug = s1.slug || '-' || SUBSTRING(s1.id::text, 1, 6)
WHERE EXISTS (
  SELECT 1 FROM public.services s2
  WHERE s2.slug = s1.slug AND s2.id != s1.id
);

-- 4. Add unique constraint
ALTER TABLE public.services
ADD CONSTRAINT services_slug_unique UNIQUE (slug);

-- 5. Add index for slug lookups
CREATE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);

-- 6. Make slug NOT NULL after backfill
ALTER TABLE public.services
ALTER COLUMN slug SET NOT NULL;
