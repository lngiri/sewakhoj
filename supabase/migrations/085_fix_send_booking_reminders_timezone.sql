-- Migration 085: Fix send_booking_reminders() Nepal timezone handling
-- The bookings table stores booking_time in UTC (frontend converts Nepal time → UTC
-- via formatSlotToDbTime()), but the function used ::TIMESTAMPTZ which relies on
-- the PostgreSQL session timezone being UTC. This is fragile — if the session TZ
-- changes, comparisons against now() break.
--
-- Fixes:
--   1. send_booking_reminders() — uses explicit AT TIME ZONE 'UTC' instead of ::TIMESTAMPTZ
--   2. auto_create_invoice() — same fix for consistency
--   3. Adds a cron job for send_booking_reminders() running every 15 minutes
--      (Nepal's +5:45 offset means bookings land at :15/:45 past the UTC hour,
--       so a 1-hour window needs sub-hourly cron granularity)

-- ============================================================================
-- 1. FIX send_booking_reminders()
--    Change: (b.booking_date + b.booking_time)::TIMESTAMPTZ
--         → (b.booking_date + b.booking_time) AT TIME ZONE 'UTC'
--    This explicitly tells PG the stored booking_time is UTC, regardless of
--    the session timezone setting.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_booking_reminders()
RETURNS void AS $$
DECLARE
  v_api_url TEXT;
  v_booking RECORD;
  v_tasker_name TEXT;
  v_customer_name TEXT;
  v_booking_tstz TIMESTAMPTZ;
BEGIN
  -- Dynamic API URL
  v_api_url := public.get_push_api_url() || '/api/push/send';

  FOR v_booking IN
    SELECT b.*, t.user_id AS tasker_user_id
    FROM public.bookings b
    JOIN public.taskers t ON b.tasker_id = t.id
    WHERE b.status = 'accepted'
      AND b.booking_date IS NOT NULL
      AND b.booking_time IS NOT NULL
      AND b.reminder_sent_at IS NULL
      -- booking_time is UTC (frontend converts Nepal time → UTC before storing).
      -- Use explicit AT TIME ZONE 'UTC' so comparisons work regardless of session TZ.
      AND (b.booking_date + b.booking_time) AT TIME ZONE 'UTC' > now()
      AND (b.booking_date + b.booking_time) AT TIME ZONE 'UTC' <= now() + interval '1 hour'
  LOOP
    -- Get names
    SELECT full_name INTO v_tasker_name FROM public.users WHERE id = v_booking.tasker_user_id;
    SELECT full_name INTO v_customer_name FROM public.users WHERE id = v_booking.customer_id;

    -- Notify customer
    INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
    VALUES (
      v_booking.customer_id,
      'Booking Reminder',
      COALESCE(v_tasker_name, 'Your tasker') || ' arrives in 1 hour',
      'status',
      '/booking/' || v_booking.id || '/tracking',
      false
    );

    PERFORM
      net.http_post(
        url := v_api_url,
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := json_build_object(
          'user_id', v_booking.customer_id,
          'title', 'Booking Reminder',
          'body', COALESCE(v_tasker_name, 'Your tasker') || ' arrives in 1 hour',
          'data', json_build_object(
            'booking_id', v_booking.id,
            'type', 'booking_reminder',
            'url', '/booking/' || v_booking.id || '/tracking'
          )
        )::jsonb
      );

    -- Notify tasker
    INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
    VALUES (
      v_booking.tasker_user_id,
      'Booking Reminder',
      'You have a job with ' || COALESCE(v_customer_name, 'a customer') || ' in 1 hour',
      'status',
      '/booking/' || v_booking.id || '/tracking',
      false
    );

    PERFORM
      net.http_post(
        url := v_api_url,
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := json_build_object(
          'user_id', v_booking.tasker_user_id,
          'title', 'Booking Reminder',
          'body', 'You have a job with ' || COALESCE(v_customer_name, 'a customer') || ' in 1 hour',
          'data', json_build_object(
            'booking_id', v_booking.id,
            'type', 'booking_reminder',
            'url', '/booking/' || v_booking.id || '/tracking'
          )
        )::jsonb
      );

    -- Mark reminder as sent
    UPDATE public.bookings SET reminder_sent_at = now() WHERE id = v_booking.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. FIX auto_create_invoice()
--    Same fix: use explicit AT TIME ZONE 'UTC' for the booking timestamp.
--    This ensures invoice due dates are computed correctly regardless of session TZ.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_number TEXT;
    v_booking RECORD;
    v_booking_tstz TIMESTAMPTZ;
BEGIN
    -- Only for cash receivable entries (tasker owes us commission)
    IF NEW.type = 'receivable' AND NEW.payment_method = 'cash' THEN
        v_invoice_number := public.generate_invoice_number();

        -- Get booking date/time for due date calculation (7 days from booking completion)
        SELECT booking_date, booking_time INTO v_booking
        FROM public.bookings WHERE id = NEW.booking_id;

        -- booking_time is UTC; use explicit AT TIME ZONE 'UTC' to be session-TZ-safe
        v_booking_tstz := (v_booking.booking_date + v_booking.booking_time) AT TIME ZONE 'UTC';

        INSERT INTO public.invoices (
            invoice_number,
            ledger_id,
            tasker_id,
            booking_id,
            amount_due,
            commission_amount,
            total_amount,
            payment_method,
            status,
            due_date,
            notes
        ) VALUES (
            v_invoice_number,
            NEW.id,
            NEW.tasker_id,
            NEW.booking_id,
            NEW.commission_amount,  -- amount_due = commission (what tasker owes us)
            NEW.commission_amount,
            NEW.total_amount,
            NEW.payment_method,
            'draft',
            COALESCE(v_booking_tstz, NOW()) + INTERVAL '7 days',
            'Auto-generated from cash booking completion'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. SCHEDULE: send_booking_reminders() every 15 minutes
--    Nepal's UTC+5:45 offset means booking times land at :15 or :45 past
--    the UTC hour (e.g., 10:00 NST = 04:15 UTC). A 1-hour window [now, now+1h]
--    needs sub-hourly cron granularity to catch these :15/:45 offsets reliably.
--
--    Schedule: */15 * * * *  (every 15 minutes)
--    This ensures every :15 and :45 booking is caught within a 1-hour window.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if re-running migration
    PERFORM cron.unschedule('send-booking-reminders');

    PERFORM cron.schedule(
      'send-booking-reminders',       -- job_name (must be unique)
      '*/15 * * * *',                  -- schedule: every 15 minutes
      $$SELECT public.send_booking_reminders();$$
    );

    RAISE NOTICE 'Cron job "send-booking-reminders" scheduled: every 15 minutes.';
  ELSE
    RAISE WARNING 'pg_cron not available. Schedule send_booking_reminders() externally (e.g. Vercel Cron).';
  END IF;
END $$;

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.send_booking_reminders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_create_invoice() TO authenticated, service_role;
