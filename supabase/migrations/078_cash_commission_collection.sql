-- Migration 078: Cash Commission Collection / Invoicing Workflow
-- Phase 4.3 — Formal invoicing for cash-paying taskers' commission collection

BEGIN;

-- ============================================================================
-- 1. Invoices table for cash commission collection
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE,
    ledger_id UUID REFERENCES public.commission_ledger(id) ON DELETE RESTRICT,
    tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    amount_due NUMERIC(10, 2) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    status invoice_status NOT NULL DEFAULT 'draft',
    due_date TIMESTAMPTZ NOT NULL,
    issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    collected_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate invoice number
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    v_next INT;
BEGIN
    SELECT nextval('public.invoice_number_seq') INTO v_next;
    RETURN 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_next::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 2. RLS for invoices
-- ============================================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Taskers can view their own invoices
CREATE POLICY "Taskers can view own invoices" ON public.invoices
    FOR SELECT USING (
        tasker_id IN (SELECT id FROM public.taskers WHERE user_id = auth.uid())
    );

-- Finance / Super Admin can manage all invoices
CREATE POLICY "Finance can manage invoices" ON public.invoices
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'finance'))
    );

-- Allow system insert
CREATE POLICY "Allow insert invoices" ON public.invoices
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 3. Function: Auto-create invoice when commission_ledger receivable is created
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_number TEXT;
    v_booking RECORD;
BEGIN
    -- Only for cash receivable entries (tasker owes us commission)
    IF NEW.type = 'receivable' AND NEW.payment_method = 'cash' THEN
        v_invoice_number := public.generate_invoice_number();

        -- Get booking info for due date calculation (7 days from booking completion)
        SELECT scheduled_date INTO v_booking
        FROM public.bookings WHERE id = NEW.booking_id;

        INSERT INTO public.invoices (
            invoice_number,
            ledger_id,
            tasker_id,
            booking_id,
            amount_due,
            commission_amount,
            total_amount,
            payment_method,
            status,
            due_date,
            notes
        ) VALUES (
            v_invoice_number,
            NEW.id,
            NEW.tasker_id,
            NEW.booking_id,
            NEW.commission_amount,  -- amount_due = commission (what tasker owes us)
            NEW.commission_amount,
            NEW.total_amount,
            NEW.payment_method,
            'draft',
            COALESCE(v_booking.scheduled_date, NOW()) + INTERVAL '7 days',
            'Auto-generated from cash booking completion'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_invoice ON public.commission_ledger;
CREATE TRIGGER trg_auto_create_invoice
    AFTER INSERT ON public.commission_ledger
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_invoice();

-- ============================================================================
-- 4. Function: Mark invoice as paid (and settle the associated ledger entry)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_invoice_paid(
    p_invoice_id UUID,
    p_collected_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_invoice RECORD;
BEGIN
    SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    IF v_invoice.status = 'paid' THEN
        RAISE EXCEPTION 'Invoice already marked as paid';
    END IF;

    IF v_invoice.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot mark cancelled invoice as paid';
    END IF;

    -- Update invoice
    UPDATE public.invoices SET
        status = 'paid',
        collected_by = p_collected_by,
        collected_at = NOW(),
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_invoice_id;

    -- Settle the associated ledger entry
    UPDATE public.commission_ledger SET
        status = 'settled',
        settled_at = NOW()
    WHERE id = v_invoice.ledger_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Function: Get outstanding receivables summary for dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_outstanding_receivables()
RETURNS TABLE (
    total_outstanding NUMERIC,
    overdue_amount NUMERIC,
    invoice_count BIGINT,
    overdue_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(i.amount_due) FILTER (WHERE i.status IN ('draft', 'sent', 'overdue')), 0) AS total_outstanding,
        COALESCE(SUM(i.amount_due) FILTER (WHERE i.status = 'overdue' OR (i.due_date < NOW() AND i.status IN ('draft', 'sent'))), 0) AS overdue_amount,
        COUNT(*) FILTER (WHERE i.status IN ('draft', 'sent', 'overdue')) AS invoice_count,
        COUNT(*) FILTER (WHERE i.status = 'overdue' OR (i.due_date < NOW() AND i.status IN ('draft', 'sent'))) AS overdue_count
    FROM public.invoices i;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

GRANT ALL ON public.invoices TO authenticated, service_role;
GRANT USAGE ON SEQUENCE public.invoice_number_seq TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_create_invoice() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_invoice_paid(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_outstanding_receivables() TO authenticated, service_role;

COMMIT;