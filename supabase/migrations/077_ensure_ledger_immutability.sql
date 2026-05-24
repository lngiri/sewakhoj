-- Migration 077: Ensure Ledger Immutability
-- Phase 4.2 — Prevent modification/deletion of financial records
-- Only `status` and `settled_at` columns may be updated on commission_ledger

BEGIN;

-- ============================================================================
-- 1. Prevent modification of immutable ledger columns
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_ledger_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Protect core financial fields from modification
    IF OLD.id IS DISTINCT FROM NEW.id THEN
        RAISE EXCEPTION 'Cannot modify ledger entry id';
    END IF;

    IF OLD.booking_id IS DISTINCT FROM NEW.booking_id THEN
        RAISE EXCEPTION 'Cannot modify ledger booking_id';
    END IF;

    IF OLD.tasker_id IS DISTINCT FROM NEW.tasker_id THEN
        RAISE EXCEPTION 'Cannot modify ledger tasker_id';
    END IF;

    IF OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
        RAISE EXCEPTION 'Cannot modify ledger total_amount';
    END IF;

    IF OLD.commission_amount IS DISTINCT FROM NEW.commission_amount THEN
        RAISE EXCEPTION 'Cannot modify ledger commission_amount';
    END IF;

    IF OLD.type IS DISTINCT FROM NEW.type THEN
        RAISE EXCEPTION 'Cannot modify ledger type';
    END IF;

    IF OLD.payment_method IS DISTINCT FROM NEW.payment_method THEN
        RAISE EXCEPTION 'Cannot modify ledger payment_method';
    END IF;

    IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
        RAISE EXCEPTION 'Cannot modify ledger created_at';
    END IF;

    -- Allow status → settled transitions
    IF OLD.status = 'settled' AND NEW.status = 'pending' THEN
        RAISE EXCEPTION 'Cannot revert ledger status from settled to pending';
    END IF;

    -- Auto-set settled_at when status changes to settled
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'settled' THEN
        IF NEW.settled_at IS NULL THEN
            NEW.settled_at := NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_ledger_immutability ON public.commission_ledger;
CREATE TRIGGER trg_protect_ledger_immutability
    BEFORE UPDATE ON public.commission_ledger
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_ledger_immutability();

-- ============================================================================
-- 2. Prevent deletion of ledger entries
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_ledger_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Cannot delete ledger entries. Financial records must be preserved.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_ledger_deletion ON public.commission_ledger;
CREATE TRIGGER trg_prevent_ledger_deletion
    BEFORE DELETE ON public.commission_ledger
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_ledger_deletion();

-- ============================================================================
-- 3. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.protect_ledger_immutability() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prevent_ledger_deletion() TO authenticated, service_role;

COMMIT;
