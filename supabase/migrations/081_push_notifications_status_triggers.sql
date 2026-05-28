-- Migration 081: Push notification triggers for all booking status transitions
-- Phase 5.5 — Full ride-sharing/delivery app parity push notifications
--
-- Changes:
--   1. Installs pg_net extension for HTTP requests from triggers
--   2. Stores push API base URL in platform_settings (configurable per environment)
--   3. Updates all existing notify_* functions to read URL dynamically (no hardcoding)
--   4. Adds new trigger for on-the-way, arrived, in-progress, completed, cancelled pushes
--   5. Cleans up old/orphaned triggers

BEGIN;

-- ============================================================================
-- 1. INSTALL pg_net EXTENSION
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant minimal usage (required for authenticated/service_role contexts to call net.http_post)
GRANT USAGE ON SCHEMA extensions TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION net.http_post TO authenticated, service_role;

-- ============================================================================
-- 2. ADD push_api_url COLUMN TO platform_settings (overridable per environment)
-- ============================================================================

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS push_api_url TEXT DEFAULT 'https://sewakhoj.com';

-- Set default on existing row if NULL
UPDATE public.platform_settings
SET push_api_url = 'https://sewakhoj.com'
WHERE push_api_url IS NULL;

-- ============================================================================
-- 3. HELPER FUNCTION: get_push_api_url()
--    Reads the base URL from platform_settings with fallback.
--    Used by all notify_* functions to avoid hardcoded URLs.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_push_api_url()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_url TEXT;
BEGIN
  SELECT push_api_url INTO v_url FROM public.platform_settings LIMIT 1;
  RETURN COALESCE(v_url, 'https://sewakhoj.com');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_push_api_url() TO authenticated, service_role;

-- ============================================================================
-- 4. UPDATE: notify_new_booking() — Dynamic URL
--    Fires on INSERT of booking with pending_acceptance status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_api_url TEXT;
  v_tasker_user_id UUID;
  v_customer_name TEXT;
  v_service_name TEXT;
  v_prefs RECORD;
BEGIN
  -- Only fire for pending_acceptance status
  IF NEW.status != 'pending_acceptance' THEN
    RETURN NEW;
  END IF;

  -- Dynamic API URL
  v_api_url := public.get_push_api_url() || '/api/push/send';

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
        url := v_api_url,
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

-- ============================================================================
-- 5. UPDATE: notify_booking_accepted() — Dynamic URL
--    Fires on status UPDATE to 'accepted'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_booking_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_api_url TEXT;
  v_tasker_name TEXT;
BEGIN
  -- Dynamic API URL
  v_api_url := public.get_push_api_url() || '/api/push/send';

  -- Get tasker info
  SELECT u.full_name INTO v_tasker_name
  FROM public.taskers t
  JOIN public.users u ON t.user_id = u.id
  WHERE t.id = NEW.tasker_id;

  -- Insert in-app notification
  INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
  VALUES (
    NEW.customer_id,
    'Booking Accepted!',
    COALESCE(v_tasker_name, 'Your tasker') || ' has accepted your booking',
    'status',
    '/booking/' || NEW.id || '/tracking',
    false
  );

  -- Send push notification
  PERFORM
    net.http_post(
      url := v_api_url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := json_build_object(
        'user_id', NEW.customer_id,
        'title', 'Booking Accepted!',
        'body', COALESCE(v_tasker_name, 'Your tasker') || ' has accepted your booking',
        'data', json_build_object(
          'booking_id', NEW.id,
          'type', 'booking_accepted',
          'url', '/booking/' || NEW.id || '/tracking'
        )
      )::jsonb
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. UPDATE: notify_new_message() — Dynamic URL
--    Fires BEFORE INSERT on messages
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_api_url TEXT;
  v_booking RECORD;
  v_sender_name TEXT;
  v_receiver_id UUID;
  v_prefs RECORD;
BEGIN
  -- Dynamic API URL
  v_api_url := public.get_push_api_url() || '/api/push/send';

  -- Get booking info to find the receiver
  SELECT customer_id, tasker_id INTO v_booking
  FROM public.bookings WHERE id = NEW.booking_id;

  -- Determine receiver (the person who did NOT send the message)
  IF v_booking.customer_id = NEW.sender_id THEN
    v_receiver_id := v_booking.tasker_id;
  ELSE
    v_receiver_id := v_booking.customer_id;
  END IF;

  -- Set receiver_id on the message if not already set
  IF NEW.receiver_id IS NULL THEN
    NEW.receiver_id := v_receiver_id;
  END IF;

  -- Check notification preferences
  SELECT * INTO v_prefs FROM public.notification_preferences
  WHERE user_id = v_receiver_id;

  IF v_prefs IS NULL OR v_prefs.messages = true THEN
    -- Get sender name
    SELECT full_name INTO v_sender_name FROM public.users WHERE id = NEW.sender_id;

    -- Insert notification
    INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
    VALUES (
      v_receiver_id,
      'New Message',
      COALESCE(v_sender_name, 'Someone') || ' sent you a message',
      'message',
      '/booking/' || NEW.booking_id || '/tracking',
      false
    );

    -- Trigger push notification via HTTP
    PERFORM
      net.http_post(
        url := v_api_url,
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := json_build_object(
          'user_id', v_receiver_id,
          'title', 'New Message',
          'body', COALESCE(v_sender_name, 'Someone') || ' sent you a message',
          'data', json_build_object(
            'booking_id', NEW.booking_id,
            'type', 'new_message',
            'url', '/booking/' || NEW.booking_id || '/tracking'
          )
        )::jsonb
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. UPDATE: send_booking_reminders() — Dynamic URL
--    Called by cron job, sends 1-hour-before reminders
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_booking_reminders()
RETURNS void AS $$
DECLARE
  v_api_url TEXT;
  v_booking RECORD;
  v_tasker_name TEXT;
  v_customer_name TEXT;
BEGIN
  -- Dynamic API URL
  v_api_url := public.get_push_api_url() || '/api/push/send';

  FOR v_booking IN
    SELECT b.*, t.user_id AS tasker_user_id
    FROM public.bookings b
    JOIN public.taskers t ON b.tasker_id = t.id
    WHERE b.status = 'accepted'
      AND b.scheduled_date IS NOT NULL
      AND b.scheduled_date > now()
      AND b.scheduled_date <= now() + interval '1 hour'
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
-- 8. UPDATE: notify_payout_processed() — Dynamic URL
--    Fires on UPDATE of status to 'settled' on commission_ledger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_payout_processed()
RETURNS TRIGGER AS $$
DECLARE
  v_api_url TEXT;
  v_tasker_user_id UUID;
  v_prefs RECORD;
BEGIN
  -- Dynamic API URL
  v_api_url := public.get_push_api_url() || '/api/push/send';

  -- Only fire when status changes to 'settled'
  IF NEW.status = 'settled' AND (OLD.status IS NULL OR OLD.status <> 'settled') THEN
    -- Get tasker's user_id directly from taskers table
    SELECT t.user_id INTO v_tasker_user_id
    FROM public.taskers t
    WHERE t.id = NEW.tasker_id;

    -- Check preferences
    SELECT * INTO v_prefs FROM public.notification_preferences
    WHERE user_id = v_tasker_user_id;

    IF v_prefs IS NULL OR v_prefs.payout_updates = true THEN
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
      VALUES (
        v_tasker_user_id,
        'Payout Processed',
        'Rs ' || NEW.total_amount || ' has been settled to your account',
        'info',
        '/dashboard',
        false
      );

      PERFORM
        net.http_post(
          url := v_api_url,
          headers := '{"Content-Type":"application/json"}'::jsonb,
          body := json_build_object(
            'user_id', v_tasker_user_id,
            'title', 'Payout Processed',
            'body', 'Rs ' || NEW.total_amount || ' has been settled to your account',
            'data', json_build_object(
              'type', 'payout',
              'url', '/dashboard'
            )
          )::jsonb
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. NEW FUNCTION: notify_booking_status_update()
--    Handles push notifications for on-the-way, arrived, in-progress, completed, cancelled
--    These are the "micro-status" transitions that ride-sharing/delivery apps push
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_booking_status_update()
RETURNS TRIGGER AS $$
DECLARE
  v_api_url TEXT;
  v_customer_user_id UUID;
  v_tasker_user_id UUID;
  v_tasker_name TEXT;
  v_service_name TEXT;
BEGIN
  -- Dynamic API URL
  v_api_url := public.get_push_api_url() || '/api/push/send';

  -- Skip if no real status change
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get customer's auth user_id
  SELECT id INTO v_customer_user_id FROM auth.users WHERE id = NEW.customer_id;

  -- Get tasker's user_id (if tasker assigned)
  v_tasker_user_id := NULL;
  IF NEW.tasker_id IS NOT NULL THEN
    SELECT t.user_id, u.full_name INTO v_tasker_user_id, v_tasker_name
    FROM public.taskers t
    JOIN public.users u ON t.user_id = u.id
    WHERE t.id = NEW.tasker_id;
  END IF;

  -- Get service name
  SELECT s.name INTO v_service_name FROM public.services s WHERE s.id = NEW.service;

  -- Route notification based on new status
  CASE NEW.status
    WHEN 'on-the-way' THEN
      -- Push notification to customer
      IF v_customer_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
        VALUES (
          NEW.customer_id,
          'Tasker is on the way! 🚗',
          COALESCE(v_tasker_name, 'Your tasker') || ' is heading to your location for ' ||
            COALESCE(v_service_name, 'your booking') || '. Track them in real-time!',
          'status',
          '/booking/' || NEW.id || '/tracking',
          false
        );

        PERFORM net.http_post(
          url := v_api_url,
          headers := '{"Content-Type":"application/json"}'::jsonb,
          body := json_build_object(
            'user_id', v_customer_user_id,
            'title', 'Tasker is on the way! 🚗',
            'body', COALESCE(v_tasker_name, 'Your tasker') || ' is heading to your location.',
            'data', json_build_object(
              'booking_id', NEW.id,
              'type', 'on_the_way',
              'url', '/booking/' || NEW.id || '/tracking'
            )
          )::jsonb
        );
      END IF;

    WHEN 'arrived' THEN
      -- Push notification to customer
      IF v_customer_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
        VALUES (
          NEW.customer_id,
          'Tasker has arrived! 📍',
          COALESCE(v_tasker_name, 'Your tasker') || ' has arrived at your location for ' ||
            COALESCE(v_service_name, 'your booking') || '.',
          'status',
          '/booking/' || NEW.id || '/tracking',
          false
        );

        PERFORM net.http_post(
          url := v_api_url,
          headers := '{"Content-Type":"application/json"}'::jsonb,
          body := json_build_object(
            'user_id', v_customer_user_id,
            'title', 'Tasker has arrived! 📍',
            'body', COALESCE(v_tasker_name, 'Your tasker') || ' is at your location and ready to begin.',
            'data', json_build_object(
              'booking_id', NEW.id,
              'type', 'arrived',
              'url', '/booking/' || NEW.id || '/tracking'
            )
          )::jsonb
        );
      END IF;

    WHEN 'in-progress' THEN
      -- Push notification to customer
      IF v_customer_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
        VALUES (
          NEW.customer_id,
          'Service in progress ⚙️',
          COALESCE(v_tasker_name, 'Your tasker') || ' has started working on ' ||
            COALESCE(v_service_name, 'your booking') || '!',
          'status',
          '/booking/' || NEW.id || '/tracking',
          false
        );

        PERFORM net.http_post(
          url := v_api_url,
          headers := '{"Content-Type":"application/json"}'::jsonb,
          body := json_build_object(
            'user_id', v_customer_user_id,
            'title', 'Service in progress ⚙️',
            'body', 'Your tasker is now working on your booking.',
            'data', json_build_object(
              'booking_id', NEW.id,
              'type', 'in_progress',
              'url', '/booking/' || NEW.id || '/tracking'
            )
          )::jsonb
        );
      END IF;

    WHEN 'completed' THEN
      -- Push notification to customer
      IF v_customer_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
        VALUES (
          NEW.customer_id,
          'Service completed! ✅',
          'Your booking for ' || COALESCE(v_service_name, 'the service') ||
            ' is complete! Please take a moment to rate your experience.',
          'status',
          '/booking/' || NEW.id || '/tracking',
          false
        );

        PERFORM net.http_post(
          url := v_api_url,
          headers := '{"Content-Type":"application/json"}'::jsonb,
          body := json_build_object(
            'user_id', v_customer_user_id,
            'title', 'Service completed! ✅',
            'body', 'Your booking is complete! Please rate your experience.',
            'data', json_build_object(
              'booking_id', NEW.id,
              'type', 'completed',
              'url', '/booking/' || NEW.id || '/tracking'
            )
          )::jsonb
        );

        -- Also notify tasker (job done acknowledgment)
        IF v_tasker_user_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
          VALUES (
            v_tasker_user_id,
            'Job completed! ✅',
            'You have completed ' || COALESCE(v_service_name, 'a booking') ||
              ' for ' || COALESCE(v_tasker_name, 'your customer') || '.',
            'status',
            '/tasker/jobs',
            false
          );

          PERFORM net.http_post(
            url := v_api_url,
            headers := '{"Content-Type":"application/json"}'::jsonb,
            body := json_build_object(
              'user_id', v_tasker_user_id,
              'title', 'Job completed! ✅',
              'body', 'You have completed a job. Well done!',
              'data', json_build_object(
                'booking_id', NEW.id,
                'type', 'completed',
                'url', '/tasker/jobs'
              )
            )::jsonb
          );
        END IF;
      END IF;

    WHEN 'cancelled' THEN
      -- Push notification to customer
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
      VALUES (
        NEW.customer_id,
        'Booking cancelled',
        'Your booking for ' || COALESCE(v_service_name, 'the service') || ' has been cancelled.',
        'alert',
        '/dashboard',
        false
      );

      IF v_customer_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := v_api_url,
          headers := '{"Content-Type":"application/json"}'::jsonb,
          body := json_build_object(
            'user_id', v_customer_user_id,
            'title', 'Booking cancelled',
            'body', 'Your booking has been cancelled.',
            'data', json_build_object(
              'booking_id', NEW.id,
              'type', 'cancelled',
              'url', '/dashboard'
            )
          )::jsonb
        );
      END IF;

      -- Also notify tasker (if one was assigned)
      IF v_tasker_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
        VALUES (
          v_tasker_user_id,
          'Booking cancelled',
          'A booking for ' || COALESCE(v_service_name, 'a service') || ' has been cancelled.',
          'alert',
          '/tasker/jobs',
          false
        );

        PERFORM net.http_post(
          url := v_api_url,
          headers := '{"Content-Type":"application/json"}'::jsonb,
          body := json_build_object(
            'user_id', v_tasker_user_id,
            'title', 'Booking cancelled',
            'body', 'A booking has been cancelled.',
            'data', json_build_object(
              'booking_id', NEW.id,
              'type', 'cancelled',
              'url', '/tasker/jobs'
            )
          )::jsonb
        );
      END IF;

    ELSE
      -- Unknown status, do nothing
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. CREATE TRIGGER FOR STATUS UPDATES
--     Fires AFTER UPDATE OF status for new transitions (excludes 'accepted'
--     which has its own trigger — notify_booking_accepted — to avoid duplicates)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_notify_booking_status_update ON public.bookings;
CREATE TRIGGER trg_notify_booking_status_update
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('on-the-way', 'arrived', 'in-progress', 'completed', 'cancelled'))
  EXECUTE FUNCTION public.notify_booking_status_update();

-- ============================================================================
-- 11. CLEAN UP OLD/ORPHANED TRIGGERS
--     Migration 040 created trigger_booking_accepted. Migration 051 created
--     trg_notify_booking_accepted but may not have dropped the old one.
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_booking_accepted ON public.bookings;

-- ============================================================================
-- 12. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.notify_booking_status_update() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_new_booking() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_booking_accepted() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_new_message() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_booking_reminders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_payout_processed() TO authenticated, service_role;

COMMIT;
