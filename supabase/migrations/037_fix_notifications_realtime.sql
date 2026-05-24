-- Migration: Enhance Notifications for Realtime Reliability and Admin Targeting
-- 1. Ensure Realtime is highly reliable by setting Replica Identity to FULL
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Add target_role to allow role-based notifications (e.g., all admins)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role TEXT;

-- 3. Update RLS to allow users to see notifications sent to their role
-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own or role-based notifications"
ON public.notifications FOR SELECT
USING (
    auth.uid() = user_id
    OR
    (target_role = 'admin' AND EXISTS (
        SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid()
    ))
);

-- 4. Ensure Realtime handles the new column in filters
-- (No change needed to PUBLICATION, it already includes all columns)
