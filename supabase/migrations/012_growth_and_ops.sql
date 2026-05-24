-- 1. Featured Taskers
ALTER TABLE public.taskers
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;

-- 2. Promo Codes System
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER CHECK (discount_percent > 0 AND discount_percent <= 100),
    max_uses INTEGER DEFAULT 100,
    current_uses INTEGER DEFAULT 0,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Dispute Management
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    raised_by UUID REFERENCES auth.users(id),
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under-investigation', 'resolved', 'refunded')),
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Immutable Ledger Trigger
CREATE OR REPLACE FUNCTION prevent_settled_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'settled' THEN
        RAISE EXCEPTION 'Cannot modify a settled ledger entry for audit integrity.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_settled_ledger_update ON public.commission_ledger;
CREATE TRIGGER trigger_prevent_settled_ledger_update
BEFORE UPDATE ON public.commission_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_settled_ledger_update();

-- 5. RLS for new tables
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check promo codes" ON public.promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their own disputes" ON public.disputes FOR SELECT USING (auth.uid() = raised_by OR auth.uid() IN (SELECT user_id FROM public.taskers WHERE id = (SELECT tasker_id FROM public.bookings WHERE id = booking_id)));
CREATE POLICY "Admins can manage disputes" ON public.disputes FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.staff_roles));
