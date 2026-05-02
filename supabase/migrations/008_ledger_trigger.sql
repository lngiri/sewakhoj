-- 008: Automatic Commission Ledger Trigger
-- This trigger automatically creates a ledger entry when a booking is completed.

-- 1. Create the function
CREATE OR REPLACE FUNCTION public.handle_booking_completion()
RETURNS TRIGGER AS $$
DECLARE
    platform_commission_rate NUMERIC;
    calculated_commission NUMERIC;
    ledger_type public.ledger_type;
BEGIN
    -- Only act if the status is changing to 'completed'
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        
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
        IF NEW.payment_method = 'cash' THEN
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
            NEW.payment_method,
            'pending'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_booking_completed ON public.bookings;
CREATE TRIGGER on_booking_completed
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_booking_completion();
