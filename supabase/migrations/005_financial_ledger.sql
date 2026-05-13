-- Phase 2: Commission Engine & Platform Settings

-- 1. Platform Settings (Singleton table for global config)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_rate_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Super admin can update settings" ON public.platform_settings FOR ALL USING (
   EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Insert default setting
INSERT INTO public.platform_settings (commission_rate_percentage) VALUES (10.00);

-- 2. Commission Ledger

DO $$ BEGIN
    CREATE TYPE ledger_type AS ENUM ('receivable', 'payable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ledger_status AS ENUM ('pending', 'settled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.commission_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL,
    type ledger_type NOT NULL, -- receivable: Cash paid to tasker, tasker owes us. payable: Online paid to us, we owe tasker.
    payment_method TEXT NOT NULL,
    status ledger_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

-- Taskers can view their own ledger
CREATE POLICY "Taskers can view their ledger" ON public.commission_ledger FOR SELECT USING (
    tasker_id IN (SELECT id FROM public.taskers WHERE user_id = auth.uid())
);

-- Finance and Super Admin can view/manage ledger
CREATE POLICY "Finance can manage ledger" ON public.commission_ledger FOR ALL USING (
    EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'finance'))
);

-- Allow system to insert into ledger when booking is completed
CREATE POLICY "Allow insert on complete" ON public.commission_ledger FOR INSERT WITH CHECK (true);
