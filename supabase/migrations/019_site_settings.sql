-- site_settings table to manage global variables
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view settings" ON public.site_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.site_settings
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.staff_roles WHERE role IN ('admin', 'super_admin', 'operations')
        )
    );

-- Initial WhatsApp number
INSERT INTO public.site_settings (id, value, description) 
VALUES ('whatsapp_number', '9779812345678', 'Support WhatsApp number with country code')
ON CONFLICT (id) DO NOTHING;
