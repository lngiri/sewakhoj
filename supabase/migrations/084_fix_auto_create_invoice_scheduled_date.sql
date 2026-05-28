-- Migration 084: Fix scheduled_date references in auto_create_invoice() and send_booking_reminders()
-- The bookings table uses booking_date (DATE) + booking_time (TIME) columns,
-- NOT scheduled_date (which was never added to the schema).
--
-- Fixes:
--   1. auto_create_invoice() — references scheduled_date, called by trigger on commission_ledger INSERT,
--      causing failures when bookings transition to 'completed'
--   2. send_booking_reminders() — references scheduled_date in cron job, uses wrong column

-- ============================================================================
-- 1. FIX auto_create_invoice()
--    Trigger: AFTER INSERT ON commission_ledger (for cash receivable entries)
--    Error: SELECT scheduled_date FROM bookings — column does not exist
--    Fix: Use booking_date + booking_time combined as TIMESTAMPTZ
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_number TEXT;
    v_booking RECORD;
    v_scheduled_timestamptz TIMESTAMPTZ;
BEGIN
    -- Only for cash receivable entries (tasker owes us commission)
    IF NEW.type = 'receivable' AND NEW.payment_method = 'cash' THEN
        v_invoice_number := public.generate_invoice_number();

        -- Get booking date/time for due date calculation (7 days from booking completion)
        SELECT booking_date, booking_time INTO v_booking
        FROM public.bookings WHERE id = NEW.booking_id;

        -- Combine booking_date + booking_time into a TIMESTAMPTZ
        v_scheduled_timestamptz := (v_booking.booking_date + v_booking.booking_time)::TIMESTAMPTZ;

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
            COALESCE(v_scheduled_timestamptz, NOW()) + INTERVAL '7 days',
            'Auto-generated from cash booking completion'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. FIX send_booking_reminders()
--    Called by cron job, not a trigger, so it doesn't cause immediate errors,
--    but the WHERE clause filtering on scheduled_date silently returns 0 rows.
--    Fix: Use booking_date + booking_time to determine upcoming bookings.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_booking_reminders()
RETURNS void AS $$
DECLARE
  v_api_url TEXT;
  v_booking RECORD;
  v_tasker_name TEXT;
  v_customer_name TEXT;
  v_scheduled_timestamptz TIMESTAMPTZ;
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
      AND (b.booking_date + b.booking_time)::TIMESTAMPTZ > now()
      AND (b.booking_date + b.booking_time)::TIMESTAMPTZ <= now() + interval '1 hour'
      AND b.reminder_sent_at IS NULL
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
-- 3. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.auto_create_invoice() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_booking_reminders() TO authenticated, service_role;
