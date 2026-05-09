-- Migration: Add International Family Support Columns
-- This enables users abroad to book for their family in Nepal.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_family_booking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
ADD COLUMN IF NOT EXISTS recipient_notes TEXT;

COMMENT ON COLUMN public.bookings.is_family_booking IS 'True if the service is for someone other than the booker (e.g. family in Nepal)';
COMMENT ON COLUMN public.bookings.recipient_name IS 'Name of the family member receiving the service';
COMMENT ON COLUMN public.bookings.recipient_phone IS 'Local Nepal phone number of the family member';
COMMENT ON COLUMN public.bookings.recipient_notes IS 'Personal message or instructions for the family member';
