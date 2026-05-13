-- KYC Verification System for Taskers

-- 1. Create KYC Table
CREATE TABLE IF NOT EXISTS public.tasker_kyc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('nagarikta', 'driving_license', 'passport')),
    document_front_url TEXT NOT NULL,
    document_back_url TEXT,
    selfie_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 2. Enable RLS
ALTER TABLE public.tasker_kyc ENABLE ROW LEVEL SECURITY;

-- Taskers can view and insert their own KYC
CREATE POLICY "Taskers can view their own KYC" ON public.tasker_kyc
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.taskers WHERE id = tasker_id));

CREATE POLICY "Taskers can insert their own KYC" ON public.tasker_kyc
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.taskers WHERE id = tasker_id));

-- Admins can view and update all KYC records
CREATE POLICY "Admins can manage KYC" ON public.tasker_kyc
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- 3. Storage Bucket Setup (If executing via superuser)
-- Note: You may need to create the 'kyc_documents' bucket manually in the Supabase Dashboard
-- if your SQL editor lacks permissions to insert into storage.buckets.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc_documents', 'kyc_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'kyc_documents' bucket
-- Allow authenticated taskers to upload to their folder
DROP POLICY IF EXISTS "Taskers can upload KYC docs" ON storage.objects;
CREATE POLICY "Taskers can upload KYC docs" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'kyc_documents' AND auth.role() = 'authenticated'
    );

-- Allow admins to read all KYC docs
DROP POLICY IF EXISTS "Admins can view KYC docs" ON storage.objects;
CREATE POLICY "Admins can view KYC docs" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'kyc_documents' AND 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );
