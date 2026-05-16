-- 046_phase1_security_data_integrity.sql
-- Phase 1: Security & Data Integrity Foundation
-- Covers: Phone format validation, booking conflict detection, status transition validation,
--          price validation, ledger full immutability

-- ============================================================================
-- 1. PHONE FORMAT VALIDATION
-- ============================================================================

-- Add Nepal phone format check (users.phone already has UNIQUE from migration 000)
-- Accepts: +977XXXXXXXXXX, 97XXXXXXXX, 98XXXXXXXX
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_format_check;
ALTER TABLE public.users ADD CONSTRAINT users_phone_format_check
  CHECK (phone IS NULL OR phone ~ '^(\+977[0-9]{10}|9[78][0-9]{8})$');

-- ============================================================================
-- 2. BOOKING CONFLICT DETECTION (Server-Side)
-- ============================================================================

-- Function to check if a tasker already has a booking in the given time range
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_tasker_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_hours INTEGER,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  p_end_time TIME;
  conflict_exists BOOLEAN;
BEGIN
  -- Calculate end time
  p_end_time := p_start_time + (p_hours || ' hours')::INTERVAL;

  -- Check for overlapping bookings
  SELECT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE tasker_id = p_tasker_id
      AND booking_date = p_booking_date
      AND status NOT IN ('cancelled', 'rejected')
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND (
        -- New booking starts during existing booking
        (booking_time <= p_start_time AND (booking_time + (hours || ' hours')::INTERVAL) > p_start_time)
        OR
        -- New booking ends during existing booking
        (booking_time < p_end_time AND (booking_time + (hours || ' hours')::INTERVAL) >= p_end_time)
        OR
        -- New booking completely contains existing booking
        (p_start_time <= booking_time AND p_end_time >= (booking_time + (hours || ' hours')::INTERVAL))
      )
  ) INTO conflict_exists;

  RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent double-booking at the database level
CREATE OR REPLACE FUNCTION prevent_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF check_booking_conflict(NEW.tasker_id, NEW.booking_date, NEW.booking_time, NEW.hours, NEW.id) THEN
    RAISE EXCEPTION 'This time slot is no longer available. Please choose a different time.'
      USING HINT = 'Another booking already exists for this tasker at the selected time.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_booking_conflict ON public.bookings;
CREATE TRIGGER trigger_prevent_booking_conflict
  BEFORE INSERT OR UPDATE OF booking_date, booking_time, hours, tasker_id
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_booking_conflict();

-- ============================================================================
-- 3. BOOKING STATUS TRANSITION VALIDATION
-- ============================================================================

-- Add 'rejected' and 'disputed' to the status constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'accepted', 'rejected', 'on-the-way', 'arrived', 'in-progress', 'completed', 'cancelled', 'disputed'));

-- Function to validate status transitions
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- No change, allow
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define legal transitions
  CASE OLD.status
    WHEN 'pending' THEN
      IF NEW.status NOT IN ('confirmed', 'accepted', 'cancelled', 'rejected') THEN
        RAISE EXCEPTION 'Cannot transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'confirmed' THEN
      IF NEW.status NOT IN ('accepted', 'cancelled', 'rejected') THEN
        RAISE EXCEPTION 'Cannot transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'accepted' THEN
      IF NEW.status NOT IN ('on-the-way', 'arrived', 'in-progress', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'on-the-way' THEN
      IF NEW.status NOT IN ('arrived', 'in-progress', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'arrived' THEN
      IF NEW.status NOT IN ('in-progress', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'in-progress' THEN
      IF NEW.status NOT IN ('completed', 'disputed') THEN
        RAISE EXCEPTION 'Cannot transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'completed' THEN
      IF NEW.status NOT IN ('disputed') THEN
        RAISE EXCEPTION 'Cannot transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'disputed' THEN
      -- Only admin can resolve disputes (checked via application logic)
      IF NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Cannot transition from cancelled status';
    WHEN 'rejected' THEN
      RAISE EXCEPTION 'Cannot transition from rejected status';
    ELSE
      RAISE EXCEPTION 'Unknown status: %', OLD.status;
  END CASE;

  -- Log the transition
  INSERT INTO public.booking_logs (booking_id, old_status, new_status, actor_id, created_at)
  VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_validate_booking_status ON public.bookings;
CREATE TRIGGER trigger_validate_booking_status
  BEFORE UPDATE OF status
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_status_transition();

-- ============================================================================
-- 4. PRICE VALIDATION (Server-Side)
-- ============================================================================

-- Basic server-side price guard: total_amount must be positive
CREATE OR REPLACE FUNCTION validate_booking_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_amount IS NOT NULL AND NEW.total_amount <= 0 THEN
    RAISE EXCEPTION 'Booking total amount must be greater than zero.'
      USING HINT = 'The total_amount field must be a positive integer.';
  END IF;

  IF NEW.hours IS NOT NULL AND NEW.hours <= 0 THEN
    RAISE EXCEPTION 'Booking hours must be greater than zero.'
      USING HINT = 'The hours field must be a positive integer.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_booking_price ON public.bookings;
CREATE TRIGGER trigger_validate_booking_price
  BEFORE INSERT OR UPDATE OF total_amount, hours
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_price();

-- ============================================================================
-- 5. COMMISSION LEDGER FULL IMMUTABILITY
-- ============================================================================

-- Strengthen existing trigger: block ALL updates and deletes, not just settled ones
-- The existing trigger from migration 012 only blocks updates to settled entries.
-- This replaces it with full immutability.

DROP TRIGGER IF EXISTS trigger_prevent_settled_ledger_update ON public.commission_ledger;
DROP FUNCTION IF EXISTS prevent_settled_ledger_update();

CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Commission ledger entries are immutable and cannot be updated.'
      USING HINT = 'To reverse an entry, insert a new row with negated amounts and reference the original via reversal_of.';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Commission ledger entries are immutable and cannot be deleted.'
      USING HINT = 'To reverse an entry, insert a new row with negated amounts and reference the original via reversal_of.';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_ledger_modification
  BEFORE UPDATE OR DELETE ON public.commission_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ledger_modification();

-- Add reversal tracking columns
ALTER TABLE public.commission_ledger
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reversal_of UUID REFERENCES public.commission_ledger(id);

-- ============================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for conflict detection queries
CREATE INDEX IF NOT EXISTS idx_bookings_tasker_date_status
  ON public.bookings(tasker_id, booking_date, status)
  WHERE status NOT IN ('cancelled', 'rejected');

-- Index for booking logs lookup
CREATE INDEX IF NOT EXISTS idx_booking_logs_booking_id
  ON public.booking_logs(booking_id, created_at DESC);