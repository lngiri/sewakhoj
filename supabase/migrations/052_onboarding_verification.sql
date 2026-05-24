-- Migration 052: Onboarding & Verification Hardening
-- Phase 5 — KYC Retention, Onboarding Progress, SMS Monitoring
-- Covers recommendations: #27, #29, #46

BEGIN;

-- ============================================================================
-- 5.1 — KYC Document Retention Policy (#27)
-- ============================================================================

-- Add retention and deletion columns to tasker_kyc
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasker_kyc' AND column_name = 'retention_until'
    ) THEN
        ALTER TABLE public.tasker_kyc ADD COLUMN retention_until TIMESTAMPTZ
            DEFAULT (now() + interval '5 years');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasker_kyc' AND column_name = 'deletion_requested_at'
    ) THEN
        ALTER TABLE public.tasker_kyc ADD COLUMN deletion_requested_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasker_kyc' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.tasker_kyc ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- Function to purge expired KYC documents
CREATE OR REPLACE FUNCTION public.purge_expired_kyc()
RETURNS TABLE(purged_count INTEGER, storage_errors INTEGER) AS $$
DECLARE
    v_record RECORD;
    v_purged INTEGER := 0;
    v_storage_errors INTEGER := 0;
BEGIN
    FOR v_record IN
        SELECT id, document_front_url, document_back_url, selfie_url
        FROM public.tasker_kyc
        WHERE retention_until < now()
          AND deleted_at IS NULL
    LOOP
        -- Soft-delete the record
        UPDATE public.tasker_kyc
        SET deleted_at = now(),
            document_front_url = '[REDACTED]',
            document_back_url = '[REDACTED]',
            selfie_url = '[REDACTED]'
        WHERE id = v_record.id;

        v_purged := v_purged + 1;
    END LOOP;

    -- Also handle deletion requests older than 30 days
    FOR v_record IN
        SELECT id, document_front_url, document_back_url, selfie_url
        FROM public.tasker_kyc
        WHERE deletion_requested_at < (now() - interval '30 days')
          AND deleted_at IS NULL
    LOOP
        UPDATE public.tasker_kyc
        SET deleted_at = now(),
            document_front_url = '[REDACTED]',
            document_back_url = '[REDACTED]',
            selfie_url = '[REDACTED]'
        WHERE id = v_record.id;

        v_purged := v_purged + 1;
    END LOOP;

    purged_count := v_purged;
    storage_errors := v_storage_errors;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5.2 — Onboarding Progress Persistence (#29)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 6),
    steps_completed INTEGER[] DEFAULT '{}',
    form_data JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT now(),
    last_updated TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    abandoned_at TIMESTAMPTZ
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Users can manage own onboarding progress" ON public.onboarding_progress
    FOR ALL USING (auth.uid() = user_id);

-- Admin read access for analytics
DROP POLICY IF EXISTS "Admins can view onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Admins can view onboarding progress" ON public.onboarding_progress
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Index for abandoned funnel analysis
CREATE INDEX IF NOT EXISTS idx_onboarding_abandoned
    ON public.onboarding_progress(abandoned_at, current_step)
    WHERE completed_at IS NULL;

-- ============================================================================
-- 5.3 — SMS Cost Monitoring (#46)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'transactional'
        CHECK (message_type IN ('otp', 'booking', 'alert', 'marketing', 'transactional')),
    message_text TEXT,
    message_length INTEGER,
    status TEXT NOT NULL DEFAULT 'sent'
        CHECK (status IN ('sent', 'failed', 'queued')),
    error_message TEXT,
    cost_estimate NUMERIC(5,2) DEFAULT 0.25,
    gateway_response TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view SMS logs (contains phone numbers)
DROP POLICY IF EXISTS "Admins can view SMS logs" ON public.sms_logs;
CREATE POLICY "Admins can view SMS logs" ON public.sms_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Allow system/service_role to insert
DROP POLICY IF EXISTS "Service role can insert SMS logs" ON public.sms_logs;
CREATE POLICY "Service role can insert SMS logs" ON public.sms_logs
    FOR INSERT WITH CHECK (true);

-- Index for cost analysis
CREATE INDEX IF NOT EXISTS idx_sms_logs_date ON public.sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_type ON public.sms_logs(message_type, created_at DESC);

-- ============================================================================
-- 5.4 — Grant Permissions
-- ============================================================================

GRANT ALL ON public.onboarding_progress TO authenticated, service_role;
GRANT ALL ON public.sms_logs TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purge_expired_kyc() TO service_role;

COMMIT;
