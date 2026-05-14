-- Migration 044: Add missing UPDATE RLS policy for user_roles table
-- The user_roles table had SELECT, INSERT, DELETE policies but no UPDATE policy.
-- This caused upsert operations to fail when the row already existed (upsert internally tries UPDATE first).
-- Regular users (without service role bypass) would silently fail on user_roles upsert during auth callback.

-- Add UPDATE policy for user_roles
CREATE POLICY "Users can update their own roles" ON public.user_roles
  FOR UPDATE USING (auth.uid() = user_id);

-- Also add a service role bypass policy for admin operations
CREATE POLICY "Service role can manage all user_roles" ON public.user_roles
  FOR ALL USING (true)
  WITH CHECK (true);