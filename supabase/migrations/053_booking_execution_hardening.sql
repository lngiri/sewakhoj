-- Migration 053: Booking & Execution Hardening
-- Phase 6 — Abandoned Recovery, Time-on-Site, Job Checklist
-- Covers recommendations: #22, #35, #36

BEGIN;

-- ============================================================================
-- 6.2 — Abandoned Booking Recovery (#22)
-- ============================================================================

-- Function to find and recover abandoned bookings
CREATE OR REPLACE FUNCTION public.recover_abandoned_bookings()
RETURNS TABLE(
    recovered_id UUID,
    recovered_customer_id UUID,
    recovered_tasker_name TEXT,
    recovered_service TEXT,
    recovered_last_step INTEGER
) AS $$
DECLARE
    abandoned RECORD;
BEGIN
    FOR abandoned IN
        SELECT b.id, b.customer_id, b.service, b.last_step_completed,
               t.user_id AS tasker_user_id,
               u.full_name AS tasker_name
        FROM public.bookings b
        JOIN public.taskers t ON t.id = b.tasker_id
        JOIN public.users u ON u.id = t.user_id
        WHERE b.is_draft = true
          AND b.abandoned_at IS NOT NULL
          AND b.abandoned_at < now() - INTERVAL '1 hour'
          AND b.abandoned_at > now() - INTERVAL '72 hours'
          AND b.status != 'completed'
          AND b.status != 'cancelled'
    LOOP
        -- Send recovery notification to customer
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            abandoned.customer_id,
            'Complete Your Booking 🔄',
            'You were booking ' || abandoned.tasker_name || ' for ' || abandoned.service ||
            '. Would you like to finish? Your progress has been saved.',
            'info',
            '/book/' || abandoned.tasker_user_id
        );

        recovered_id := abandoned.id;
        recovered_customer_id := abandoned.customer_id;
        recovered_tasker_name := abandoned.tasker_name;
        recovered_service := abandoned.service;
        recovered_last_step := abandoned.last_step_completed;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6.4 — Time-on-Site Tracking (#35)
-- ============================================================================

-- Add arrived_at and departed_at columns to bookings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'arrived_at'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN arrived_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'departed_at'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN departed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Function to calculate time on site (in minutes)
CREATE OR REPLACE FUNCTION public.booking_time_on_site(p_booking_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_arrived TIMESTAMPTZ;
    v_departed TIMESTAMPTZ;
BEGIN
    SELECT arrived_at, departed_at INTO v_arrived, v_departed
    FROM public.bookings WHERE id = p_booking_id;

    IF v_arrived IS NULL THEN
        RETURN 0;
    END IF;

    RETURN EXTRACT(EPOCH FROM (COALESCE(v_departed, now()) - v_arrived))::INTEGER / 60;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6.5 — Job Checklist / Scope Verification (#36)
-- ============================================================================

-- Add checklist column to bookings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'checklist'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN checklist JSONB DEFAULT '[]';
    END IF;
END $$;

-- Index for querying bookings with checklists
CREATE INDEX IF NOT EXISTS idx_bookings_checklist
    ON public.bookings USING gin(checklist)
    WHERE checklist IS NOT NULL AND jsonb_array_length(checklist) > 0;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.recover_abandoned_bookings() TO service_role;
GRANT EXECUTE ON FUNCTION public.booking_time_on_site(UUID) TO authenticated, service_role;

COMMIT;
