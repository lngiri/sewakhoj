-- Fix RLS for announcements to use the unified staff_roles system
-- The previous policy was checking users.role which might be outdated or missing

DROP POLICY IF EXISTS "Admin can manage announcements" ON public.announcements;

CREATE POLICY "Staff can manage announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (
    auth.uid() IN (SELECT user_id FROM public.staff_roles)
)
WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.staff_roles)
);

-- Ensure public can still read active ones
DROP POLICY IF EXISTS "Public can read active announcements" ON public.announcements;
CREATE POLICY "Public can read active announcements"
ON public.announcements FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));
