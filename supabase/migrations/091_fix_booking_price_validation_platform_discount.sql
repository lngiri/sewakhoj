-- Migration 091: Fix booking price validation, fix exec_ddl search_path
--
-- Part 1: Fix exec_ddl() search_path so DDL migrations can run through the API
--   The old SET search_path = '' prevents unqualified table names from resolving.
CREATE OR REPLACE FUNCTION public.exec_ddl(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  EXECUTE query;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_ddl(TEXT) TO authenticated, service_role;

-- Part 2: Fix validate_booking_price() to account for 5% platform payment discount
--
-- The trigger (from migration 076) rejected any booking where
-- total_amount < hourly_rate x hours. However, the client-side booking
-- page applies a 5% discount for non-cash (eSewa / platform) payments:
--
--   paymentDiscount = FLOOR(subtotal x 0.05)
--   total = subtotal - paymentDiscount - promoDiscount
--
-- Fix: when payment_method != 'cash', apply the same 5% discount to the
-- minimum total check so the trigger matches the validated client price.

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

  -- Server-side rate-based validation: total must be >= hourly_rate x hours
  SELECT hourly_rate INTO v_hourly_rate
  FROM public.taskers
  WHERE id = NEW.tasker_id;

  IF v_hourly_rate IS NOT NULL AND v_hourly_rate > 0 THEN
    v_minimum_total := v_hourly_rate * NEW.hours;

    -- Apply 5% platform payment discount for non-cash payments
    -- This matches the client-side calculateTotal() logic in the booking page
    IF NEW.payment_method IS NOT NULL AND NEW.payment_method != 'cash' THEN
      v_minimum_total := FLOOR(v_minimum_total * 0.95);
    END IF;

    -- Allow tolerance of 1 rupee (prevents floating point edge cases)
    IF NEW.total_amount < (v_minimum_total - 1) THEN
      RAISE EXCEPTION 'Booking total (Rs %) is below the minimum allowed (Rs %) based on tasker hourly rate (Rs %/hr x % hrs).',
        NEW.total_amount, v_minimum_total, v_hourly_rate, NEW.hours
        USING HINT = 'The total amount must at least cover the base rate x hours.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION validate_booking_price() TO anon, authenticated, service_role;
