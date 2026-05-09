-- Add description_ne to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS description_ne TEXT;
