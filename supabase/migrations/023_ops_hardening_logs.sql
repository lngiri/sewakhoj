-- Migration: Operational Hardening for Phase 3 (FIXED)
-- 1. Audit Logs for Status Changes
CREATE TABLE IF NOT EXISTS public.booking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Formal Dispute System
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES auth.users(id),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'cancelled')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- SAFETY CHECK: If table existed but column was missing, add it
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='disputes' AND column_name='reporter_id') THEN
        ALTER TABLE public.disputes ADD COLUMN reporter_id UUID NOT NULL REFERENCES auth.users(id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.booking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to prevent "already exists" errors
DROP POLICY IF EXISTS "Users can view logs for their own bookings" ON public.booking_logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.booking_logs;
DROP POLICY IF EXISTS "Users can view their own disputes" ON public.disputes;
DROP POLICY IF EXISTS "Admins can view and manage all disputes" ON public.disputes;
DROP POLICY IF EXISTS "Users can insert their own disputes" ON public.disputes;

-- Policies for Logs
CREATE POLICY "Users can view logs for their own bookings" 
ON public.booking_logs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.id = booking_id 
        AND (b.customer_id = auth.uid() OR b.tasker_id IN (SELECT id FROM public.taskers WHERE user_id = auth.uid()))
    )
);

CREATE POLICY "Authenticated users can insert logs" 
ON public.booking_logs FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Policies for Disputes
CREATE POLICY "Users can view their own disputes" 
ON public.disputes FOR SELECT 
USING (reporter_id = auth.uid());

CREATE POLICY "Admins can view and manage all disputes" 
ON public.disputes FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_roles 
        WHERE user_id = auth.uid() 
        AND role::text IN ('admin', 'super_admin', 'support', 'operations')
    )
);

CREATE POLICY "Users can insert their own disputes" 
ON public.disputes FOR INSERT 
WITH CHECK (reporter_id = auth.uid());
