-- Migration 073: Enforce phone uniqueness and add server-side validation
-- Ensures the UNIQUE constraint exists on users.phone and adds helper functions

BEGIN;

-- ============================================================================
-- 1. Ensure UNIQUE constraint exists on users.phone
-- ============================================================================
-- The constraint was originally created in migration 000. This ensures it
-- still exists after any schema modifications, and adds it if missing.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE public.users ADD CONSTRAINT users_phone_key UNIQUE (phone);

-- ============================================================================
-- 2. Add a function to atomically check-and-claim a phone number
-- ============================================================================
-- This uses a database transaction to atomically check if a phone is available
-- and claim it, preventing race conditions between two simultaneous signups.
CREATE OR REPLACE FUNCTION public.claim_phone_number(
  p_user_id UUID,
  p_phone TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- Validate phone format
  IF p_phone IS NULL OR p_phone !~ '^9[78][0-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid Nepal phone number format' USING HINT = 'Phone must be a 10-digit Nepal mobile number starting with 97, 98, or 96.';
  END IF;

  -- Check if phone is already taken (using FOR UPDATE to lock the row)
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE phone = p_phone
  FOR UPDATE;

  IF existing_user_id IS NOT NULL THEN
    RETURN FALSE; -- Phone already taken
  END IF;

  -- Claim the phone number
  UPDATE public.users
  SET phone = p_phone
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Add a function to check if a phone is already taken by another user
-- ============================================================================
-- Use this for settings/onboarding where the user already has a record.
CREATE OR REPLACE FUNCTION public.is_phone_taken(
  p_phone TEXT,
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  existing_id UUID;
BEGIN
  SELECT id INTO existing_id
  FROM public.users
  WHERE phone = p_phone
    AND (p_exclude_user_id IS NULL OR id <> p_exclude_user_id)
  LIMIT 1;

  RETURN existing_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 4. Create an index on phone for faster lookups
-- ============================================================================
DROP INDEX IF EXISTS idx_users_phone_lookup;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_lookup
  ON public.users(phone)
  WHERE phone IS NOT NULL;

COMMIT;