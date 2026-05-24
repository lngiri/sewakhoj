-- Migration 051: Push Notification Triggers & Fixes
-- Phase 4.1 — Functional Push Notifications
-- Also includes: read_at hardening, notification_preferences table (Phase 4.5)

BEGIN;

-- ============================================================================
-- 1. Fix push_subscriptions column names to match API route expectations
--    Migration 040 used p256dh/auth but API route expects p256dh_key/auth_key
--    Add the _key suffixed columns and migrate data
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'push_subscriptions' AND column_name = 'p256dh_key'
    ) THEN
        ALTER TABLE public.push_subscriptions ADD COLUMN p256dh_key TEXT;
        UPDATE public.push_subscriptions SET p256dh_key = p256dh WHERE p256dh_key IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'push_subscriptions' AND column_name = 'auth_key'
    ) THEN
        ALTER TABLE public.push_subscriptions ADD COLUMN auth_key TEXT;
        UPDATE public.push_subscriptions SET auth_key = auth WHERE auth_key IS NULL;
    END IF;
END $$;

-- ============================================================================
-- 2. Ensure read_at column exists on messages (for Phase 4.2)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'read_at'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN read_at TIMESTAMPTZ;
        CREATE INDEX idx_messages_unread ON public.messages(receiver_id) WHERE read_at IS NULL;
    END IF;
END $$;

-- ============================================================================
-- 3. Notification Preferences Table (Phase 4.5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    booking_updates BOOLEAN DEFAULT true,
    messages BOOLEAN DEFAULT true,
    promotions BOOLEAN DEFAULT true,
    payout_updates BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users can manage own notification prefs" ON public.notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Auto-create preferences row when user is created
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_notification_prefs ON public.users;
CREATE TRIGGER trg_create_notification_prefs
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_notification_preferences();

-- ============================================================================
-- 4. New Message → Push Notification Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_booking RECORD;
    v_sender_name TEXT;
    v_receiver_id UUID;
    v_prefs RECORD;
BEGIN
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
                url := 'https://sewakhoj.com/api/push/send',
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

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
    BEFORE INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_message();

-- ============================================================================
-- 5. Booking Reminder Trigger (1 hour before scheduled time)
--    This would be called by a cron job, but we add the function here
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_booking_reminders()
RETURNS void AS $$
DECLARE
    v_booking RECORD;
    v_tasker_name TEXT;
    v_customer_name TEXT;
BEGIN
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
                url := 'https://sewakhoj.com/api/push/send',
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
                url := 'https://sewakhoj.com/api/push/send',
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

-- Add reminder_sent_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'reminder_sent_at'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN reminder_sent_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- 6. Payout Processed → Push Notification Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_payout_processed()
RETURNS TRIGGER AS $$
DECLARE
    v_tasker_user_id UUID;
    v_prefs RECORD;
BEGIN
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
                    url := 'https://sewakhoj.com/api/push/send',
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

DROP TRIGGER IF EXISTS trg_notify_payout ON public.commission_ledger;
CREATE TRIGGER trg_notify_payout
    AFTER UPDATE OF status ON public.commission_ledger
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_payout_processed();

-- ============================================================================
-- 7. Fix booking accepted trigger to use net.http_post (more reliable)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_booking_accepted()
RETURNS TRIGGER AS $$
DECLARE
    v_tasker_name TEXT;
    v_tasker_user_id UUID;
BEGIN
    -- Get tasker info
    SELECT u.full_name, t.user_id INTO v_tasker_name, v_tasker_user_id
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
            url := 'https://sewakhoj.com/api/push/send',
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
-- 8. Grant permissions
-- ============================================================================

GRANT ALL ON public.notification_preferences TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_notification_preferences() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_new_message() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_booking_reminders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_payout_processed() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_booking_accepted() TO authenticated, service_role;

COMMIT;
