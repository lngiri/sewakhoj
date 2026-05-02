-- Create System Logs table for Audit trail
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'kyc_approval', 'kyc_rejection', 'ledger_settlement', 'role_change', etc.
    target_id UUID, -- ID of the tasker, ledger, or user being modified
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view system logs" ON public.system_logs
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.staff_roles)
    );

-- Logs can only be inserted by system/admins, no update/delete allowed for integrity
CREATE POLICY "Admins can insert system logs" ON public.system_logs
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.staff_roles)
    );
