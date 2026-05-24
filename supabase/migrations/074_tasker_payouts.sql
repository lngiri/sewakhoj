-- Migration 074: Tasker Payout/Disbursement System
-- Adds payout_methods (tasker payout preferences) and payouts (admin disbursement) tables.

BEGIN;

-- ============================================================================
-- 1. payout_methods — each tasker stores how they want to be paid
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payout_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE UNIQUE,
    method TEXT NOT NULL CHECK (method IN ('esewa', 'khalti', 'bank_transfer')),
    account_holder TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT,
    branch TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_methods ENABLE ROW LEVEL SECURITY;

-- Taskers manage their own payout method
CREATE POLICY "Taskers manage own payout method"
    ON public.payout_methods
    FOR ALL
    USING (
        tasker_id IN (SELECT id FROM public.taskers WHERE user_id = auth.uid())
    );

-- Finance/Super Admin can view all
CREATE POLICY "Finance can view all payout methods"
    ON public.payout_methods
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'finance'))
    );

-- ============================================================================
-- 2. payouts — the actual disbursement records
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tasker_id UUID REFERENCES public.taskers(id) NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payout_method TEXT NOT NULL CHECK (payout_method IN ('esewa', 'khalti', 'bank_transfer', 'cash_pickup')),
    payout_details JSONB DEFAULT '{}'::jsonb,    -- { esewa_id, bank_account, account_holder, bank_name, branch }
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    reference_id TEXT,                             -- transaction ID from eSewa/Khalti/bank
    admin_notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Taskers can view only their own payouts
CREATE POLICY "Taskers view own payouts"
    ON public.payouts
    FOR SELECT
    USING (
        tasker_id IN (SELECT id FROM public.taskers WHERE user_id = auth.uid())
    );

-- Finance/Super Admin can manage all payouts
CREATE POLICY "Finance manage payouts"
    ON public.payouts
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'finance'))
    );

-- ============================================================================
-- 3. Helper functions for the payout system
-- ============================================================================

-- Get tasker's available payout balance (payable settled minus already paid out)
CREATE OR REPLACE FUNCTION public.get_tasker_payout_balance(p_tasker_id UUID)
RETURNS NUMERIC(10,2) AS $$
DECLARE
    v_earned NUMERIC(10,2);
    v_paid_out NUMERIC(10,2);
BEGIN
    -- Total earned from settled payable ledger entries
    SELECT COALESCE(SUM(total_amount - commission_amount), 0)
    INTO v_earned
    FROM public.commission_ledger
    WHERE tasker_id = p_tasker_id
      AND type = 'payable'
      AND status = 'settled';

    -- Total already paid out
    SELECT COALESCE(SUM(amount), 0)
    INTO v_paid_out
    FROM public.payouts
    WHERE tasker_id = p_tasker_id
      AND status IN ('completed', 'processing');

    RETURN GREATEST(v_earned - v_paid_out, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Request a payout (tasker-facing)
CREATE OR REPLACE FUNCTION public.request_payout(
    p_tasker_id UUID,
    p_method TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_balance NUMERIC(10,2);
    v_payout_id UUID;
    v_minimum NUMERIC(10,2) := 500.00;  -- Minimum payout threshold
    v_pm_method TEXT;
BEGIN
    -- Verify the method matches what's on file (unless cash_pickup)
    IF p_method = 'cash_pickup' THEN
        -- Cash pickup requires no stored method; just record it
        NULL;
    ELSE
        SELECT method INTO v_pm_method
        FROM public.payout_methods
        WHERE tasker_id = p_tasker_id;
        IF v_pm_method IS NULL THEN
            RAISE EXCEPTION 'No payout method configured. Please add a payout method first.';
        END IF;
        IF v_pm_method != p_method THEN
            RAISE EXCEPTION 'Payout method mismatch. Configured: %, requested: %', v_pm_method, p_method;
        END IF;
    END IF;

    -- Check balance
    v_balance := public.get_tasker_payout_balance(p_tasker_id);
    IF v_balance < v_minimum THEN
        RAISE EXCEPTION 'Minimum payout amount is Rs %. Available balance: Rs %', v_minimum, v_balance;
    END IF;

    -- Create payout
    INSERT INTO public.payouts (tasker_id, amount, payout_method, payout_details, status)
    VALUES (p_tasker_id, v_balance, p_method, p_details, 'pending')
    RETURNING id INTO v_payout_id;

    RETURN v_payout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process a payout (admin-facing, marks as completed)
CREATE OR REPLACE FUNCTION public.process_payout(
    p_payout_id UUID,
    p_reference_id TEXT,
    p_admin_user_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.payouts
    SET status = 'completed',
        reference_id = p_reference_id,
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        processed_by = p_admin_user_id,
        processed_at = now()
    WHERE id = p_payout_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payout not found or already processed';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payouts_tasker_status ON public.payouts(tasker_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payouts_created ON public.payouts(created_at DESC);

COMMIT;