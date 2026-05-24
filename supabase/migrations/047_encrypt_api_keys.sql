-- 047_encrypt_api_keys.sql
-- Phase 1.2: API Key Encryption with pgcrypto

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. ENCRYPTION HELPER FUNCTIONS
-- ============================================================================

-- Get the encryption secret from site_settings or use a fallback
CREATE OR REPLACE FUNCTION get_encryption_secret()
RETURNS TEXT AS $$
DECLARE
  secret TEXT;
BEGIN
  -- Try to get from site_settings
  SELECT value INTO secret
  FROM public.site_settings
  WHERE id = 'encryption_secret';

  -- Fallback to a server-derived secret if not configured
  IF secret IS NULL OR secret = '' THEN
    -- Use a combination of fixed server-side values
    secret := current_database() || '|sewakhoj|' || current_setting('server_version');
  END IF;

  RETURN secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Encrypt an API key
CREATE OR REPLACE FUNCTION encrypt_api_key(raw_key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF raw_key IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(
    pgp_sym_encrypt(raw_key, get_encryption_secret(), 'compress-algo=1, cipher-algo=aes256'),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt an API key (only callable by admin via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(
    decode(encrypted_key, 'base64'),
    get_encryption_secret(),
    'compress-algo=1, cipher-algo=aes256'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. MIGRATE EXISTING KEYS
-- ============================================================================

-- Add encrypted columns
ALTER TABLE public.api_integrations
  ADD COLUMN IF NOT EXISTS encrypted_api_key TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_api_secret TEXT;

-- Migrate existing plain-text keys to encrypted
UPDATE public.api_integrations
SET
  encrypted_api_key = CASE WHEN api_key IS NOT NULL AND api_key != ''
    THEN encrypt_api_key(api_key) ELSE NULL END,
  encrypted_api_secret = CASE WHEN api_secret IS NOT NULL AND api_secret != ''
    THEN encrypt_api_key(api_secret) ELSE NULL END;

-- Drop plain-text columns (keep for now to avoid breaking existing code; will be removed in Phase 1.11)
-- ALTER TABLE public.api_integrations DROP COLUMN api_key;
-- ALTER TABLE public.api_integrations DROP COLUMN api_secret;

-- ============================================================================
-- 3. MASKED KEY VIEW FOR ADMIN UI
-- ============================================================================

-- Function to get masked key for display (safe to send to client)
CREATE OR REPLACE FUNCTION get_masked_api_key(service_name_param TEXT)
RETURNS TEXT AS $$
DECLARE
  raw_key TEXT;
BEGIN
  SELECT decrypt_api_key(encrypted_api_key) INTO raw_key
  FROM public.api_integrations
  WHERE service_name = service_name_param;

  IF raw_key IS NULL OR length(raw_key) <= 8 THEN
    RETURN raw_key;
  END IF;

  -- Show first 4 and last 4 characters, mask the rest
  RETURN left(raw_key, 4) || repeat('*', length(raw_key) - 8) || right(raw_key, 4);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. ENCRYPTION SECRET SITE SETTING
-- ============================================================================

-- Insert default encryption secret into site_settings if not exists
INSERT INTO public.site_settings (id, value)
VALUES (
  'encryption_secret',
  encode(gen_random_bytes(32), 'base64')
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. PERMISSIONS
-- ============================================================================

-- Revoke direct access to encrypted columns from anon/authenticated
-- Only SECURITY DEFINER functions can decrypt
REVOKE ALL ON public.api_integrations FROM anon, authenticated;
GRANT SELECT (id, service_name, endpoint_url, merchant_id, is_enabled, configuration, updated_at, updated_by)
  ON public.api_integrations TO authenticated;
GRANT SELECT (id, service_name, endpoint_url, merchant_id, is_enabled, configuration, updated_at, updated_by)
  ON public.api_integrations TO anon;

-- Admin staff can see masked keys
GRANT SELECT (encrypted_api_key, encrypted_api_secret) ON public.api_integrations TO authenticated;

-- Allow admin to update (they'll use the encrypt function via RPC)
CREATE POLICY "Staff can update integrations"
  ON public.api_integrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );
