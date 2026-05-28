-- Migration 083: Fix commission_ledger NULL payment_method error on booking completion
-- When a booking transitions to 'completed', the handle_booking_completion() trigger
-- inserts into commission_ledger using NEW.payment_method. If payment_method is NULL
-- (e.g., for test bookings or edge cases), the NOT NULL constraint fails.
--
-- Fix: Use COALESCE(NEW.payment_method, 'cash') as fallback.

CREATE OR REPLACE FUNCTION public.handle_booking_completion()
RETURNS TRIGGER AS $$
DECLARE
    platform_commission_rate NUMERIC;
    calculated_commission NUMERIC;
    ledger_type public.ledger_type;
    v_payment_method TEXT;
BEGIN
    -- Only act if the status is changing to 'completed'
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN

        -- Determine payment method with fallback
        v_payment_method := COALESCE(NEW.payment_method, 'cash');

        -- Get the current commission rate from settings (default to 10% if not found)
        SELECT commission_rate_percentage INTO platform_commission_rate
        FROM public.platform_settings
        LIMIT 1;

        IF platform_commission_rate IS NULL THEN
            platform_commission_rate := 10.00;
        END IF;

        -- Calculate commission
        calculated_commission := (NEW.total_amount * platform_commission_rate) / 100;

        -- Determine ledger type
        -- receivable: Cash paid to tasker, tasker owes us platform fee.
        -- payable: Online paid to us, we owe tasker (total - platform fee).
        IF v_payment_method = 'cash' THEN
            ledger_type := 'receivable';
        ELSE
            ledger_type := 'payable';
        END IF;

        -- Insert into ledger
        INSERT INTO public.commission_ledger (
            booking_id,
            tasker_id,
            total_amount,
            commission_amount,
            type,
            payment_method,
            status
        ) VALUES (
            NEW.id,
            NEW.tasker_id,
            NEW.total_amount,
            calculated_commission,
            ledger_type,
            v_payment_method,
            'pending'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
