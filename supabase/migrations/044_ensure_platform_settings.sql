-- Ensure platform_settings has at least one default row
-- This is a safety net in case the row from 005 was deleted
INSERT INTO public.platform_settings (commission_rate_percentage)
SELECT 10.00
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);
