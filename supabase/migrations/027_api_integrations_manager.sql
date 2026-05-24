-- 027_api_integrations_manager.sql

-- Create Integrations Table
CREATE TABLE IF NOT EXISTS api_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL UNIQUE, -- esewa, mapbox, whatsapp, sms_gateway
    api_key TEXT,
    api_secret TEXT,
    endpoint_url TEXT,
    merchant_id TEXT,
    is_enabled BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;

-- Admin only access
CREATE POLICY "Admin manage integrations"
ON api_integrations FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'staff')
    )
);

-- Public can only read non-sensitive fields (if needed for frontend config like Mapbox Public Token)
-- We will handle sensitive keys through server-side lookups usually,
-- but for the dashboard UI, we'll let the admin see everything.

-- Seed initial integrations
INSERT INTO api_integrations (service_name, configuration)
VALUES
('esewa', '{"merchant_id": "EPAYTEST", "is_test": true}'::jsonb),
('whatsapp', '{"business_number": "+9779763650737", "api_provider": "direct"}'::jsonb),
('maps', '{"provider": "openstreetmap", "api_key": ""}'::jsonb),
('sms_gateway', '{"provider": "sparrow_sms", "token": ""}'::jsonb)
ON CONFLICT (service_name) DO NOTHING;
