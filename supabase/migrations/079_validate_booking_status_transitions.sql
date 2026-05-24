-- Migration 079: Validate Booking Status Transitions
-- Phase 4.4 — Database-level state machine for booking statuses

BEGIN;

-- ============================================================================
-- 0. Add timestamp columns for status tracking
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'accepted_at'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN accepted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'on_the_way_at'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN on_the_way_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;

    -- started_at already exists from migration 053
END $$;

-- ============================================================================
-- 1. Define valid status transitions
-- ============================================================================

-- Expected booking lifecycle:
--   draft → pending_acceptance → accepted → on-the-way → arrived → in-progress → completed
--   pending_acceptance → declined (by tasker)
--   Any active state → cancelled (by customer)
--   completed → disputed

CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow setting initial status on insert
    IF TG_OP = 'INSERT' THEN
        IF NEW.status NOT IN ('draft', 'pending', 'pending_acceptance') THEN
            RAISE EXCEPTION 'Invalid initial booking status: %', NEW.status;
        END IF;
        RETURN NEW;
    END IF;

    -- Skip validation if status hasn't changed
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    -- Define valid transitions
    CASE OLD.status
        WHEN 'draft' THEN
            IF NEW.status NOT IN ('pending_acceptance', 'cancelled') THEN
                RAISE EXCEPTION 'Cannot transition booking from draft to %', NEW.status;
            END IF;

        WHEN 'pending' THEN
            IF NEW.status NOT IN ('pending_acceptance', 'cancelled', 'draft') THEN
                RAISE EXCEPTION 'Cannot transition booking from pending to %', NEW.status;
            END IF;

        WHEN 'pending_acceptance' THEN
            IF NEW.status NOT IN ('accepted', 'declined', 'cancelled', 'expired') THEN
                RAISE EXCEPTION 'Cannot transition booking from pending_acceptance to %', NEW.status;
            END IF;

        WHEN 'accepted' THEN
            IF NEW.status NOT IN ('on-the-way', 'cancelled', 'expired') THEN
                RAISE EXCEPTION 'Cannot transition booking from accepted to %', NEW.status;
            END IF;

        WHEN 'on-the-way' THEN
            IF NEW.status NOT IN ('arrived', 'cancelled') THEN
                RAISE EXCEPTION 'Cannot transition booking from on-the-way to %', NEW.status;
            END IF;

        WHEN 'arrived' THEN
            IF NEW.status NOT IN ('in-progress', 'cancelled') THEN
                RAISE EXCEPTION 'Cannot transition booking from arrived to %', NEW.status;
            END IF;

        WHEN 'in-progress' THEN
            IF NEW.status NOT IN ('completed', 'cancelled') THEN
                RAISE EXCEPTION 'Cannot transition booking from in-progress to %', NEW.status;
            END IF;

        WHEN 'completed' THEN
            IF NEW.status NOT IN ('disputed') THEN
                RAISE EXCEPTION 'Cannot transition booking from completed to %', NEW.status;
            END IF;

        WHEN 'declined' THEN
            RAISE EXCEPTION 'Cannot change status of a declined booking';

        WHEN 'cancelled' THEN
            RAISE EXCEPTION 'Cannot change status of a cancelled booking';

        WHEN 'expired' THEN
            RAISE EXCEPTION 'Cannot change status of an expired booking';

        WHEN 'disputed' THEN
            IF NEW.status NOT IN ('completed', 'cancelled') THEN
                RAISE EXCEPTION 'Cannot transition booking from disputed to %', NEW.status;
            END IF;

        ELSE
            RAISE EXCEPTION 'Unknown booking status: %', OLD.status;
    END CASE;

    -- Auto-set timestamps based on status
    CASE NEW.status
        WHEN 'accepted' THEN
            IF NEW.accepted_at IS NULL THEN
                NEW.accepted_at := NOW();
            END IF;
        WHEN 'on-the-way' THEN
            IF NEW.on_the_way_at IS NULL THEN
                NEW.on_the_way_at := NOW();
            END IF;
        WHEN 'arrived' THEN
            IF NEW.arrived_at IS NULL THEN
                NEW.arrived_at := NOW();
            END IF;
        WHEN 'in-progress' THEN
            IF NEW.started_at IS NULL THEN
                NEW.started_at := NOW();
            END IF;
        WHEN 'completed' THEN
            IF NEW.completed_at IS NULL THEN
                NEW.completed_at := NOW();
            END IF;
        WHEN 'cancelled' THEN
            IF NEW.cancelled_at IS NULL THEN
                NEW.cancelled_at := NOW();
            END IF;
        ELSE
            -- No timestamp for other statuses
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Attach trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trg_validate_booking_status ON public.bookings;
CREATE TRIGGER trg_validate_booking_status
    BEFORE INSERT OR UPDATE OF status ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_booking_status_transition();

-- ============================================================================
-- 3. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.validate_booking_status_transition() TO authenticated, service_role;

COMMIT;