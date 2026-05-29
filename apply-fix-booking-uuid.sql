-- Fix: "invalid input syntax for type uuid: tech-help"
-- When a booking is created with a text service slug (e.g. "tech-help"),
-- the notify_new_booking() trigger tries to cast NEW.service::uuid which
-- fails because text slugs are not valid UUIDs.
--
-- This applies the same fix as migration 082: wrap the UUID cast in
-- a BEGIN...EXCEPTION...END block so the trigger gracefully handles
-- both UUID service IDs and text slugs.
--
-- Run this against your Supabase database.

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

  -- Get service name with safe UUID cast
  BEGIN
    SELECT s.name INTO v_service_name
    FROM public.services s WHERE s.id = NEW.service::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_service_name := NULL;
  END;

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

-- Also fix notify_booking_status_update()
CREATE OR REPLACE FUNCTION public.notify_booking_status_update()
RETURNS TRIGGER AS $$
DECLARE
  v_api_url TEXT;
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

  -- Get tasker's user_id (if tasker assigned)
  IF NEW.tasker_id IS NOT NULL THEN
    SELECT t.user_id, u.full_name INTO v_tasker_user_id, v_tasker_name
    FROM public.taskers t
    JOIN public.users u ON t.user_id = u.id
    WHERE t.id = NEW.tasker_id;
  END IF;

  -- Get service name with safe UUID cast
  BEGIN
    SELECT s.name INTO v_service_name
    FROM public.services s WHERE s.id = NEW.service::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_service_name := NULL;
  END;

  -- Route notification based on new status
  CASE NEW.status
    WHEN 'on-the-way' THEN
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
          'user_id', NEW.customer_id,
          'title', 'Tasker is on the way! 🚗',
          'body', COALESCE(v_tasker_name, 'Your tasker') || ' is heading to your location.',
          'data', json_build_object(
            'booking_id', NEW.id,
            'type', 'on_the_way',
            'url', '/booking/' || NEW.id || '/tracking'
          )
        )::jsonb
      );

    WHEN 'arrived' THEN
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
          'user_id', NEW.customer_id,
          'title', 'Tasker has arrived! 📍',
          'body', COALESCE(v_tasker_name, 'Your tasker') || ' is at your location and ready to begin.',
          'data', json_build_object(
            'booking_id', NEW.id,
            'type', 'arrived',
            'url', '/booking/' || NEW.id || '/tracking'
          )
        )::jsonb
      );

    WHEN 'in-progress' THEN
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
          'user_id', NEW.customer_id,
          'title', 'Service in progress ⚙️',
          'body', 'Your tasker is now working on your booking.',
          'data', json_build_object(
            'booking_id', NEW.id,
            'type', 'in_progress',
            'url', '/booking/' || NEW.id || '/tracking'
          )
        )::jsonb
      );

    WHEN 'completed' THEN
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
          'user_id', NEW.customer_id,
          'title', 'Service completed! ✅',
          'body', 'Your booking is complete! Please rate your experience.',
          'data', json_build_object(
            'booking_id', NEW.id,
            'type', 'completed',
            'url', '/booking/' || NEW.id || '/tracking'
          )
        )::jsonb
      );

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

    WHEN 'cancelled' THEN
      INSERT INTO public.notifications (user_id, title, message, type, link, is_read)
      VALUES (
        NEW.customer_id,
        'Booking cancelled',
        'Your booking for ' || COALESCE(v_service_name, 'the service') || ' has been cancelled.',
        'alert',
        '/dashboard',
        false
      );

      PERFORM net.http_post(
        url := v_api_url,
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := json_build_object(
          'user_id', NEW.customer_id,
          'title', 'Booking cancelled',
          'body', 'Your booking has been cancelled.',
          'data', json_build_object(
            'booking_id', NEW.id,
            'type', 'cancelled',
            'url', '/dashboard'
          )
        )::jsonb
      );

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
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.notify_new_booking() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_booking_status_update() TO authenticated, service_role;
