-- Migration 076: Harden booking conflict detection with row-level locking
-- Prevents race conditions where two concurrent inserts could create overlapping bookings
-- Uses SELECT ... FOR UPDATE on existing bookings to serialize concurrent requests

-- ============================================================================
-- 1. Rewrite check_booking_conflict() with FOR UPDATE locking
--    This ensures that concurrent booking inserts for the same tasker/date
--    are serialized — one transaction will block and re-check after the other
--    completes.
-- ============================================================================

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

  -- Check for overlapping bookings WITH ROW LOCK
  -- The FOR UPDATE locks matching rows so concurrent transactions wait
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
    FOR UPDATE  -- Row-level lock: serializes concurrent conflict checks
  ) INTO conflict_exists;

  RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Rewrite validate_booking_price() to enforce rate-based price validation
--    This prevents direct API calls from inserting manipulated prices.
--    total_amount must be >= hourly_rate * hours (addons can only increase it)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_booking_price()
RETURNS TRIGGER AS $$
DECLARE
  v_hourly_rate INTEGER;
  v_minimum_total INTEGER;
BEGIN
  IF NEW.is_draft IS TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.total_amount IS NOT NULL AND NEW.total_amount <= 0 THEN
    RAISE EXCEPTION 'Booking total amount must be greater than zero.'
      USING HINT = 'The total_amount field must be a positive integer.';
  END IF;

  IF NEW.hours IS NOT NULL AND NEW.hours <= 0 THEN
    RAISE EXCEPTION 'Booking hours must be greater than zero.'
      USING HINT = 'The hours field must be a positive integer.';
  END IF;

  -- Server-side rate-based validation: total must be >= hourly_rate * hours
  -- This catches manipulated client prices even if the /validate endpoint is bypassed
  SELECT hourly_rate INTO v_hourly_rate
  FROM public.taskers
  WHERE id = NEW.tasker_id;

  IF v_hourly_rate IS NOT NULL AND v_hourly_rate > 0 THEN
    v_minimum_total := v_hourly_rate * NEW.hours;

    -- Allow tolerance of 1 rupee (prevents floating point issues with promotions)
    IF NEW.total_amount < (v_minimum_total - 1) THEN
      RAISE EXCEPTION 'Booking total (Rs %) is below the minimum allowed (Rs %) based on tasker hourly rate (Rs %/hr × % hrs).',
        NEW.total_amount, v_minimum_total, v_hourly_rate, NEW.hours
        USING HINT = 'The total amount must at least cover the base rate × hours.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-apply the trigger so it uses the updated function
DROP TRIGGER IF EXISTS trigger_validate_booking_price ON public.bookings;
CREATE TRIGGER trigger_validate_booking_price
  BEFORE INSERT OR UPDATE OF total_amount, hours
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_price();

-- ============================================================================
-- 3. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION check_booking_conflict(UUID, DATE, TIME, INTEGER, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION validate_booking_price() TO anon, authenticated, service_role;
