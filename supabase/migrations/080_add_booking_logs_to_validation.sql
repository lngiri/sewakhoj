-- Migration 080: Restore booking_logs auditing in status validation trigger
-- The booking_logs INSERT was present in migrations 046 and 060 but
-- accidentally dropped when migration 079 replaced the function.
-- This re-adds it, using NULL::uuid for actor_id since the trigger runs
-- in SECURITY DEFINER context (auth.uid() returns NULL from service_role).

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

    -- Log the status transition
    -- Uses NULL::uuid for actor_id because the trigger fires in
    -- SECURITY DEFINER context where auth.uid() returns NULL when
    -- called via service_role (e.g., from decline_booking RPC).
    INSERT INTO public.booking_logs (booking_id, old_status, new_status, actor_id, created_at)
    VALUES (NEW.id, OLD.status, NEW.status, NULL::uuid, NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
