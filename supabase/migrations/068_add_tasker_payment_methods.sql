-- Migration 068: Add payment_methods column to taskers table

BEGIN;

ALTER TABLE public.taskers
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT '{}';

COMMIT;
