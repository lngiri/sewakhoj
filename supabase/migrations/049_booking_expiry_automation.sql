-- 049_booking_expiry_automation.sql
-- Phase 2: Booking Flow Hardening
-- Adds: expires_at column, auto-cancel functions, payment timeout support

-- ============================================================================
-- 1. Add expires_at column to bookings
-- ============================================================================
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Set expires_at for existing pending bookings (48h from created_at, or now+24h if no created_at)
UPDATE public.bookings
SET expires_at = COALESCE(created_at, now()) + INTERVAL '48 hours'
WHERE status = 'pending' AND expires_at IS NULL;

-- Index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at
ON public.bookings(expires_at)
WHERE status IN ('pending', 'confirmed', 'accepted');

-- ============================================================================
-- 2. Auto-cancel expired pending bookings (function)
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
    -- Cancel pending bookings past their expires_at
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

        -- Log the auto-cancellation
        INSERT INTO public.booking_logs (booking_id, actor_id, action, details, created_at)
        VALUES (expired.id, NULL, 'auto_cancelled', 
                jsonb_build_object('reason', 'Booking expired — no payment or acceptance within timeout'),
                now());

        -- Notify customer
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            expired.customer_id,
            'Booking Expired ⏰',
            'Your booking for ' || expired.service || ' on ' || expired.booking_date::TEXT || 
            ' at ' || expired.booking_time::TEXT || ' has expired. Please book again if you still need the service.',
            'alert',
            '/browse'
        );

        -- Notify tasker
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
-- 3. Trigger: Set expires_at on new pending bookings
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_booking_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expiry to 48 hours from now for pending bookings
    -- For cash payments, shorter 2-hour window
    IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
        IF NEW.payment_method = 'cash' THEN
            NEW.expires_at := now() + INTERVAL '2 hours';
        ELSE
            NEW.expires_at := now() + INTERVAL '48 hours';
        END IF;
    END IF;

    -- Clear expiry when booking is confirmed/accepted
    IF NEW.status IN ('accepted', 'confirmed', 'on-the-way', 'arrived', 'in-progress', 'completed') THEN
        NEW.expires_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_booking_expiry ON public.bookings;
CREATE TRIGGER trg_set_booking_expiry
    BEFORE INSERT OR UPDATE OF status, payment_method
    ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_booking_expiry();

-- ============================================================================
-- 4. Function: Get real-time slot availability (for Supabase Realtime)
-- Returns booked time ranges for a tasker on a given date
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
      AND b.status IN ('pending', 'confirmed', 'accepted', 'on-the-way', 'arrived', 'in-progress');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. Payment timeout: Mark bookings as "payment_expired" if unpaid after 30 min
-- ============================================================================
CREATE OR REPLACE FUNCTION public.expire_unpaid_bookings()
RETURNS TABLE (
    expired_id UUID,
    expired_customer_id UUID
) AS $$
DECLARE
    unpaid RECORD;
BEGIN
    FOR unpaid IN
        SELECT id, customer_id
        FROM public.bookings
        WHERE status = 'pending'
          AND payment_method != 'cash'
          AND payment_status = 'pending'
          AND created_at < now() - INTERVAL '30 minutes'
          AND expires_at IS NULL  -- only those without explicit expiry
    LOOP
        UPDATE public.bookings
        SET status = 'cancelled',
            updated_at = now()
        WHERE id = unpaid.id;

        INSERT INTO public.booking_logs (booking_id, actor_id, action, details, created_at)
        VALUES (unpaid.id, NULL, 'auto_cancelled',
                jsonb_build_object('reason', 'Payment timeout — unpaid after 30 minutes'),
                now());

        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            unpaid.customer_id,
            'Payment Timeout 💳',
            'Your booking was cancelled because payment was not completed within 30 minutes.',
            'alert',
            '/browse'
        );

        expired_id := unpaid.id;
        expired_customer_id := unpaid.customer_id;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Grant execute permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.cancel_expired_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tasker_booked_slots(UUID, DATE) TO authenticated, anon;