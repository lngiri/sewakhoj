-- 060_tasker_acceptance_system.sql
-- Phase 5: Tasker Booking Acceptance System
-- Replaces passive booking flow with active Accept/Decline + 30-min countdown + auto-reassignment
--
-- Features:
--   1. New statuses: pending_acceptance, declined
--   2. New columns: acceptance_deadline, reassignment_count, original_tasker_id, declined_by[]
--   3. New table: tasker_acceptance_metrics (acceptance_rate, response_time, ghost_rate)
--   4. Push notification on new booking INSERT (fixes the gap where taskers weren't notified)
--   5. Auto-reassignment on timeout/decline (max 3 retries, same service + city)
--   6. Auto-flagging of taskers with <50% acceptance rate over 10+ bookings

BEGIN;

-- ============================================================================
-- 1. ADD NEW STATUS VALUES TO CONSTRAINT
-- ============================================================================

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending_acceptance', 'pending', 'confirmed', 'accepted', 'declined',
    'rejected', 'on-the-way', 'arrived', 'in-progress', 'completed',
    'cancelled', 'disputed'
  ));

-- ============================================================================
-- 2. ADD NEW COLUMNS TO bookings
-- ============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS acceptance_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reassignment_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_tasker_id UUID REFERENCES public.taskers(id),
  ADD COLUMN IF NOT EXISTS declined_by UUID[] DEFAULT ARRAY[]::UUID[];

-- Index for efficient expiry queries on the new deadline column
CREATE INDEX IF NOT EXISTS idx_bookings_acceptance_deadline
  ON public.bookings(acceptance_deadline)
  WHERE status = 'pending_acceptance' AND acceptance_deadline IS NOT NULL;

-- ============================================================================
-- 3. NEW TABLE: tasker_acceptance_metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tasker_acceptance_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE UNIQUE,
  total_requests INTEGER DEFAULT 0,
  accepted_count INTEGER DEFAULT 0,
  declined_count INTEGER DEFAULT 0,
  timeout_count INTEGER DEFAULT 0,
  avg_response_seconds DOUBLE PRECISION,
  last_updated TIMESTAMPTZ DEFAULT now(),
  flagged_for_review BOOLEAN DEFAULT false,
  flagged_at TIMESTAMPTZ
);

ALTER TABLE public.tasker_acceptance_metrics ENABLE ROW LEVEL SECURITY;

-- Admins can read all metrics
DROP POLICY IF EXISTS "Admins can read acceptance metrics" ON public.tasker_acceptance_metrics;
CREATE POLICY "Admins can read acceptance metrics" ON public.tasker_acceptance_metrics
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')
  ));

-- Taskers can read their own metrics
DROP POLICY IF EXISTS "Taskers can read own metrics" ON public.tasker_acceptance_metrics;
CREATE POLICY "Taskers can read own metrics" ON public.tasker_acceptance_metrics
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.taskers t
    WHERE t.id = tasker_id AND t.user_id = auth.uid()
  ));

-- ============================================================================
-- 4. UPDATE STATUS TRANSITION VALIDATION
--    (replaces the function from migration 046)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- No change, allow
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define legal transitions
  CASE OLD.status
    WHEN 'pending_acceptance' THEN
      IF NEW.status NOT IN ('confirmed', 'declined', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot transition from pending_acceptance to %', NEW.status;
      END IF;
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
    WHEN 'declined' THEN
      IF NEW.status NOT IN ('pending_acceptance', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot transition from declined to %', NEW.status;
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

-- ============================================================================
-- 5. NEW TRIGGER: notify_new_booking() — Push notification on INSERT
--    Fixes the gap: taskers previously only got in-app notifications,
--    no push notification when a new booking was created.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_tasker_user_id UUID;
  v_customer_name TEXT;
  v_service_name TEXT;
  v_prefs RECORD;
BEGIN
  -- Only fire for pending_acceptance status
  IF NEW.status != 'pending_acceptance' THEN
    RETURN NEW;
  END IF;

  -- Get tasker's user_id
  SELECT t.user_id INTO v_tasker_user_id
  FROM public.taskers t WHERE t.id = NEW.tasker_id;

  -- Get customer name
  SELECT u.full_name INTO v_customer_name
  FROM public.users u WHERE u.id = NEW.customer_id;

  -- Get service name
  SELECT s.name INTO v_service_name
  FROM public.services s WHERE s.id = NEW.service;

  -- Check notification preferences
  SELECT * INTO v_prefs FROM public.notification_preferences
  WHERE user_id = v_tasker_user_id;

  -- In-app notification (always send)
  INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
  VALUES (
    v_tasker_user_id,
    'New Booking Request 🔔',
    COALESCE(v_customer_name, 'A customer') || ' needs ' || COALESCE(v_service_name, NEW.service) ||
    ' on ' || NEW.booking_date::TEXT || ' at ' || NEW.booking_time::TEXT,
    'status',
    '/dashboard?section=tasks&booking=' || NEW.id,
    false
  );

  -- Push notification (respect preferences)
  IF v_prefs IS NULL OR v_prefs.push_enabled = true THEN
    PERFORM
      net.http_post(
        url := 'https://sewakhoj.com/api/push/send',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := json_build_object(
          'user_id', v_tasker_user_id,
          'title', 'New Booking Request 🔔',
          'body', COALESCE(v_customer_name, 'A customer') || ' needs ' || COALESCE(v_service_name, NEW.service),
          'data', json_build_object(
            'booking_id', NEW.id,
            'type', 'new_booking',
            'url', '/dashboard?section=tasks&booking=' || NEW.id
          )
        )::jsonb
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_booking ON public.bookings;
CREATE TRIGGER trg_notify_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_booking();

-- ============================================================================
-- 6. NEW TRIGGER: set_acceptance_deadline()
--    Auto-sets 30-min countdown on pending_acceptance, clears on resolution
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_acceptance_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Set 30-minute deadline when entering pending_acceptance
  IF NEW.status = 'pending_acceptance' AND NEW.acceptance_deadline IS NULL THEN
    NEW.acceptance_deadline := now() + INTERVAL '30 minutes';
  END IF;

  -- Clear deadline when resolved (accepted/declined/cancelled)
  IF NEW.status IN ('confirmed', 'declined', 'cancelled') AND OLD.acceptance_deadline IS NOT NULL THEN
    NEW.acceptance_deadline := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_acceptance_deadline ON public.bookings;
CREATE TRIGGER trg_set_acceptance_deadline
  BEFORE INSERT OR UPDATE OF status
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_acceptance_deadline();

-- ============================================================================
-- 7. UPDATE set_booking_expiry() for new flow
--    - pending_acceptance: uses acceptance_deadline (30 min), not expires_at
--    - pending (legacy): keep existing behavior but extend cash to 12h
--    - Clear expires_at when confirmed/accepted
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_booking_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- For pending_acceptance, the acceptance_deadline trigger handles timing
  -- We still set expires_at as a safety net (2h for cash, 48h for online)
  IF NEW.status IN ('pending_acceptance', 'pending') AND NEW.expires_at IS NULL THEN
    IF NEW.payment_method = 'cash' THEN
      NEW.expires_at := now() + INTERVAL '12 hours';  -- Extended from 2h to 12h
    ELSE
      NEW.expires_at := now() + INTERVAL '48 hours';
    END IF;
  END IF;

  -- Clear expiry when booking is confirmed/accepted
  IF NEW.status IN ('confirmed', 'accepted', 'on-the-way', 'arrived', 'in-progress', 'completed') THEN
    NEW.expires_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. UPDATE cancel_expired_bookings() to handle pending_acceptance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_expired_bookings()
RETURNS TABLE (
    cancelled_id UUID,
    cancelled_customer_id UUID,
    cancelled_tasker_id UUID,
    cancelled_service TEXT,
    cancelled_booking_date DATE,
    cancelled_booking_time TIME
) AS $$
DECLARE
    expired RECORD;
BEGIN
    -- Cancel pending_acceptance bookings past their acceptance_deadline
    -- (These should have been handled by auto_reassign first, this is a safety net)
    FOR expired IN
        SELECT id, customer_id, tasker_id, service, booking_date, booking_time
        FROM public.bookings
        WHERE status = 'pending_acceptance'
          AND acceptance_deadline IS NOT NULL
          AND acceptance_deadline < now()
          AND reassignment_count >= 3  -- Only cancel if max reassignments reached
    LOOP
        UPDATE public.bookings
        SET status = 'cancelled',
            updated_at = now()
        WHERE id = expired.id;

        INSERT INTO public.booking_logs (booking_id, actor_id, action, details, created_at)
        VALUES (expired.id, NULL, 'auto_cancelled',
                jsonb_build_object('reason', 'All taskers declined or timed out — max reassignments reached'),
                now());

        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            expired.customer_id,
            'Booking Cancelled 😔',
            'No taskers were available for ' || expired.service || ' on ' || expired.booking_date::TEXT ||
            ' at ' || expired.booking_time::TEXT || '. Please try again later.',
            'alert',
            '/browse'
        );

        cancelled_id := expired.id;
        cancelled_customer_id := expired.customer_id;
        cancelled_tasker_id := expired.tasker_id;
        cancelled_service := expired.service;
        cancelled_booking_date := expired.booking_date;
        cancelled_booking_time := expired.booking_time;
        RETURN NEXT;
    END LOOP;

    -- Cancel legacy pending bookings past their expires_at
    FOR expired IN
        SELECT id, customer_id, tasker_id, service, booking_date, booking_time
        FROM public.bookings
        WHERE status = 'pending'
          AND expires_at IS NOT NULL
          AND expires_at < now()
    LOOP
        UPDATE public.bookings
        SET status = 'cancelled',
            updated_at = now()
        WHERE id = expired.id;

        INSERT INTO public.booking_logs (booking_id, actor_id, action, details, created_at)
        VALUES (expired.id, NULL, 'auto_cancelled',
                jsonb_build_object('reason', 'Booking expired — no payment or acceptance within timeout'),
                now());

        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            expired.customer_id,
            'Booking Expired ⏰',
            'Your booking for ' || expired.service || ' on ' || expired.booking_date::TEXT ||
            ' at ' || expired.booking_time::TEXT || ' has expired. Please book again if you still need the service.',
            'alert',
            '/browse'
        );

        INSERT INTO public.notifications (user_id, title, message, type, link)
        SELECT
            t.user_id,
            'Booking Expired ⏰',
            'A pending booking for ' || expired.service || ' on ' || expired.booking_date::TEXT ||
            ' has expired.',
            'info',
            '/dashboard'
        FROM public.taskers t
        WHERE t.id = expired.tasker_id;

        cancelled_id := expired.id;
        cancelled_customer_id := expired.customer_id;
        cancelled_tasker_id := expired.tasker_id;
        cancelled_service := expired.service;
        cancelled_booking_date := expired.booking_date;
        cancelled_booking_time := expired.booking_time;
        RETURN NEXT;
    END LOOP;

    -- Cancel accepted bookings past their scheduled date with no progress
    FOR expired IN
        SELECT id, customer_id, tasker_id, service, booking_date, booking_time
        FROM public.bookings
        WHERE status IN ('accepted', 'confirmed')
          AND booking_date < CURRENT_DATE
    LOOP
        UPDATE public.bookings
        SET status = 'cancelled',
            updated_at = now()
        WHERE id = expired.id;

        INSERT INTO public.booking_logs (booking_id, actor_id, action, details, created_at)
        VALUES (expired.id, NULL, 'auto_cancelled',
                jsonb_build_object('reason', 'Booking past scheduled date with no progress'),
                now());

        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            expired.customer_id,
            'Missed Booking 📅',
            'Your booking for ' || expired.service || ' on ' || expired.booking_date::TEXT ||
            ' was not started by the tasker and has been cancelled. We apologize for the inconvenience.',
            'alert',
            '/browse'
        );

        cancelled_id := expired.id;
        cancelled_customer_id := expired.customer_id;
        cancelled_tasker_id := expired.tasker_id;
        cancelled_service := expired.service;
        cancelled_booking_date := expired.booking_date;
        cancelled_booking_time := expired.booking_time;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. UPDATE get_tasker_booked_slots() to include pending_acceptance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tasker_booked_slots(
    p_tasker_id UUID,
    p_booking_date DATE
)
RETURNS TABLE (
    booking_time TIME,
    hours INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT b.booking_time, b.hours, b.status
    FROM public.bookings b
    WHERE b.tasker_id = p_tasker_id
      AND b.booking_date = p_booking_date
      AND b.is_draft IS NOT TRUE
      AND b.status IN ('pending_acceptance', 'pending', 'confirmed', 'accepted', 'on-the-way', 'arrived', 'in-progress');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 10. NEW FUNCTION: auto_reassign_expired_acceptances()
--     Called by cron job every 1-2 minutes.
--     Finds pending_acceptance bookings past deadline, reassigns to next tasker.
--     Max 3 reassignment attempts, then cancels.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_reassign_expired_acceptances()
RETURNS TABLE (
  booking_id UUID,
  old_tasker_id UUID,
  new_tasker_id UUID,
  outcome TEXT
) AS $$
DECLARE
  expired RECORD;
  v_new_tasker_id UUID;
  v_max_reassignments INTEGER := 3;
BEGIN
  FOR expired IN
    SELECT b.id, b.tasker_id, b.service, b.city, b.customer_id,
           b.reassignment_count, b.declined_by, b.original_tasker_id,
           b.booking_date, b.booking_time
    FROM public.bookings b
    WHERE b.status = 'pending_acceptance'
      AND b.acceptance_deadline IS NOT NULL
      AND b.acceptance_deadline < now()
      AND b.reassignment_count < v_max_reassignments
  LOOP
    -- Mark current tasker as timed out (declined)
    UPDATE public.bookings
    SET status = 'declined',
        declined_by = COALESCE(declined_by, ARRAY[]::UUID[]) || expired.tasker_id,
        reassignment_count = COALESCE(reassignment_count, 0) + 1,
        original_tasker_id = COALESCE(original_tasker_id, expired.tasker_id)
    WHERE id = expired.id;

    -- Update metrics: timeout for the tasker who didn't respond
    INSERT INTO public.tasker_acceptance_metrics (tasker_id, total_requests, timeout_count)
    VALUES (expired.tasker_id, 1, 1)
    ON CONFLICT (tasker_id)
    DO UPDATE SET
      total_requests = tasker_acceptance_metrics.total_requests + 1,
      timeout_count = tasker_acceptance_metrics.timeout_count + 1,
      last_updated = now();

    -- Find next available tasker (same service, same city, not declined, active)
    SELECT t.id INTO v_new_tasker_id
    FROM public.taskers t
    JOIN public.tasker_skills ts ON t.id = ts.tasker_id AND ts.service_id = expired.service
    WHERE t.status = 'active'
      AND t.id != expired.tasker_id
      AND t.id != ALL(COALESCE(expired.declined_by, ARRAY[]::UUID[]))
      AND (
        t.city ILIKE '%' || COALESCE(expired.city, '') || '%'
        OR t.service_areas ILIKE '%' || COALESCE(expired.city, '') || '%'
      )
    ORDER BY t.is_elite DESC, t.rating DESC, t.total_jobs DESC
    LIMIT 1;

    IF v_new_tasker_id IS NOT NULL THEN
      -- Reassign to new tasker with fresh 30-min deadline
      UPDATE public.bookings
      SET tasker_id = v_new_tasker_id,
          status = 'pending_acceptance',
          acceptance_deadline = now() + INTERVAL '30 minutes'
      WHERE id = expired.id;

      -- Notify customer about reassignment
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        expired.customer_id,
        'Finding You a Tasker 🔄',
        'Your previous tasker did not respond. We are assigning a new tasker for ' ||
        expired.service || ' on ' || expired.booking_date::TEXT || '.',
        'info',
        '/booking/' || expired.id || '/tracking'
      );

      -- Notify original tasker they missed it
      INSERT INTO public.notifications (user_id, title, message, type, link)
      SELECT t.user_id, 'Booking Reassigned ⏰',
             'You did not respond in time for a ' || expired.service || ' booking. It has been reassigned.',
             'alert', '/dashboard'
      FROM public.taskers t WHERE t.id = expired.tasker_id;

      booking_id := expired.id;
      old_tasker_id := expired.tasker_id;
      new_tasker_id := v_new_tasker_id;
      outcome := 'reassigned';
      RETURN NEXT;
    ELSE
      -- No alternative tasker found — cancel the booking
      UPDATE public.bookings
      SET status = 'cancelled'
      WHERE id = expired.id;

      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        expired.customer_id,
        'No Taskers Available 😔',
        'Sorry, no taskers are currently available for ' || expired.service ||
        ' in your area. Please try again later or browse other services.',
        'alert',
        '/browse'
      );

      booking_id := expired.id;
      old_tasker_id := expired.tasker_id;
      new_tasker_id := NULL;
      outcome := 'cancelled_no_taskers';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. NEW FUNCTION: flag_low_acceptance_taskers()
--     Called by cron job daily. Flags taskers with <50% acceptance over 10+ bookings.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.flag_low_acceptance_taskers()
RETURNS TABLE (
  tasker_id UUID,
  acceptance_rate NUMERIC,
  total_requests INTEGER,
  accepted_count INTEGER,
  timeout_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.tasker_acceptance_metrics tam
  SET flagged_for_review = true,
      flagged_at = now()
  WHERE tam.total_requests >= 10
    AND (tam.accepted_count::NUMERIC / NULLIF(tam.total_requests, 0)) < 0.5
    AND tam.flagged_for_review = false
  RETURNING
    tam.tasker_id,
    ROUND((tam.accepted_count::NUMERIC / NULLIF(tam.total_requests, 0)) * 100, 1) AS acceptance_rate,
    tam.total_requests,
    tam.accepted_count,
    tam.timeout_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. NEW FUNCTION: decline_booking()
--     Called by the API route. Handles array operations (declined_by[]) that
--     the Supabase JS client cannot do directly.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.decline_booking(
  p_booking_id UUID,
  p_tasker_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking RECORD;
BEGIN
  -- Fetch current booking state
  SELECT id, tasker_id, status, declined_by, reassignment_count, original_tasker_id
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
    AND status = 'pending_acceptance'
  FOR UPDATE;  -- Row lock to prevent race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or not in pending_acceptance status';
  END IF;

  IF v_booking.tasker_id != p_tasker_id THEN
    RAISE EXCEPTION 'Booking is not assigned to this tasker';
  END IF;

  -- Update booking: decline + add to declined_by array
  UPDATE public.bookings
  SET status = 'declined',
      declined_by = COALESCE(declined_by, ARRAY[]::UUID[]) || p_tasker_id,
      reassignment_count = COALESCE(reassignment_count, 0) + 1,
      original_tasker_id = COALESCE(original_tasker_id, p_tasker_id),
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 13. NEW FUNCTION: update_acceptance_metrics()
--     Called by accept/decline API routes. Updates tasker metrics atomically.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_acceptance_metrics(
  p_tasker_id UUID,
  p_action TEXT,  -- 'accepted', 'declined', or 'timeout'
  p_response_seconds DOUBLE PRECISION DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.tasker_acceptance_metrics (tasker_id, total_requests)
  VALUES (p_tasker_id, 1)
  ON CONFLICT (tasker_id) DO NOTHING;

  IF p_action = 'accepted' THEN
    UPDATE public.tasker_acceptance_metrics
    SET total_requests = total_requests + 1,
        accepted_count = accepted_count + 1,
        avg_response_seconds = CASE
          WHEN p_response_seconds IS NOT NULL AND avg_response_seconds IS NULL THEN p_response_seconds
          WHEN p_response_seconds IS NOT NULL THEN
            (avg_response_seconds * (total_requests - 1) + p_response_seconds) / total_requests
          ELSE avg_response_seconds
        END,
        last_updated = now()
    WHERE tasker_id = p_tasker_id;
  ELSIF p_action = 'declined' THEN
    UPDATE public.tasker_acceptance_metrics
    SET total_requests = total_requests + 1,
        declined_count = declined_count + 1,
        avg_response_seconds = CASE
          WHEN p_response_seconds IS NOT NULL AND avg_response_seconds IS NULL THEN p_response_seconds
          WHEN p_response_seconds IS NOT NULL THEN
            (avg_response_seconds * (total_requests - 1) + p_response_seconds) / total_requests
          ELSE avg_response_seconds
        END,
        last_updated = now()
    WHERE tasker_id = p_tasker_id;
  ELSIF p_action = 'timeout' THEN
    UPDATE public.tasker_acceptance_metrics
    SET total_requests = total_requests + 1,
        timeout_count = timeout_count + 1,
        last_updated = now()
    WHERE tasker_id = p_tasker_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 14. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.tasker_acceptance_metrics TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_new_booking() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_acceptance_deadline() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_reassign_expired_acceptances() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.flag_low_acceptance_taskers() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_booking(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_acceptance_metrics(UUID, TEXT, DOUBLE PRECISION) TO authenticated, service_role;

COMMIT;
