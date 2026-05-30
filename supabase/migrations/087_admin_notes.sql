-- Migration 087: Admin Notes — private staff notes on users/taskers

CREATE TABLE IF NOT EXISTS public.admin_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Admins can view all notes
DROP POLICY IF EXISTS "Admins can view all admin notes" ON public.admin_notes;
CREATE POLICY "Admins can view all admin notes" ON public.admin_notes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Admins can insert notes
DROP POLICY IF EXISTS "Admins can insert admin notes" ON public.admin_notes;
CREATE POLICY "Admins can insert admin notes" ON public.admin_notes
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Admins can update their own notes
DROP POLICY IF EXISTS "Admins can update own notes" ON public.admin_notes;
CREATE POLICY "Admins can update own notes" ON public.admin_notes
    FOR UPDATE USING (
        created_by = auth.uid() AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Admins can delete notes
DROP POLICY IF EXISTS "Admins can delete notes" ON public.admin_notes;
CREATE POLICY "Admins can delete notes" ON public.admin_notes
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE INDEX IF NOT EXISTS idx_admin_notes_target_user ON public.admin_notes(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_created_by ON public.admin_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_notes_created_at ON public.admin_notes(created_at DESC);

-- Function to fetch admin notes for a user
DROP FUNCTION IF EXISTS public.get_admin_notes_for_user(UUID);
CREATE OR REPLACE FUNCTION public.get_admin_notes_for_user(p_target_user_id UUID)
RETURNS TABLE (
    id UUID,
    note TEXT,
    created_by UUID,
    created_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        an.id,
        an.note,
        an.created_by,
        COALESCE(u.full_name, 'Unknown Admin') AS created_by_name,
        an.created_at,
        an.updated_at
    FROM public.admin_notes an
    LEFT JOIN public.users u ON u.id = an.created_by
    WHERE an.target_user_id = p_target_user_id
    ORDER BY an.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_notes_for_user(UUID) TO authenticated;
