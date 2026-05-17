-- Migration 061: Fix staff_roles RLS — allow all staff to read all staff roles
-- Root cause: The /admin/users page joins staff_roles(role) for every user,
-- but the existing RLS only allows reading your OWN staff role (unless super_admin).
-- Non-super-admin staff (admin, operations, finance) get a permission error
-- on the join, causing the entire query to fail silently → blank users list.

-- ============================================================================
-- 1. ADD POLICY: Any staff member can view all staff roles
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view all staff roles" ON public.staff_roles;

CREATE POLICY "Staff can view all staff roles" ON public.staff_roles
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.staff_roles));

-- ============================================================================
-- 2. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.staff_roles TO authenticated;