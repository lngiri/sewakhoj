-- Migration 082: Remove Plain-Text API Key Columns
-- Phase 1.8: Completes the encryption migration started in 047
-- Drops the plain-text api_key and api_secret columns now that runtime
-- code reads from encrypted columns via SECURITY DEFINER functions.

-- ============================================================================
-- 1. Safe retrieval function (avoids RLS — uses service_role client)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_api_credential(
    p_service_name TEXT,
    p_credential_type TEXT DEFAULT 'api_key'
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result TEXT;
BEGIN
    -- Return the decrypted credential from the appropriate encrypted column
    IF p_credential_type = 'api_key' THEN
        SELECT decrypt_api_key(encrypted_api_key) INTO v_result
        FROM public.api_integrations
        WHERE service_name = p_service_name AND is_enabled = true;
    ELSIF p_credential_type = 'api_secret' THEN
        SELECT decrypt_api_key(encrypted_api_secret) INTO v_result
        FROM public.api_integrations
        WHERE service_name = p_service_name AND is_enabled = true;
    ELSE
        RETURN NULL;
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_api_credential(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.get_api_credential IS
    'Securely retrieves a decrypted API credential by service name and type (api_key or api_secret).';

-- ============================================================================
-- 2. Drop the plain-text columns
-- ============================================================================

ALTER TABLE public.api_integrations
    DROP COLUMN IF EXISTS api_key,
    DROP COLUMN IF EXISTS api_secret;

-- ============================================================================
-- 3. Update RLS — no longer grant access to the dropped columns
-- ============================================================================

-- Ensure non-sensitive columns are still readable
GRANT SELECT (
    id, service_name, endpoint_url, merchant_id, is_enabled,
    configuration, encrypted_api_key, encrypted_api_secret,
    updated_at, updated_by
) ON public.api_integrations TO authenticated;

GRANT SELECT (
    id, service_name, endpoint_url, merchant_id, is_enabled,
    configuration, updated_at, updated_by
) ON public.api_integrations TO anon;
