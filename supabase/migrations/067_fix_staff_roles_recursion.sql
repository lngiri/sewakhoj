-- Migration 067: Fix staff_roles RLS recursion by using a SECURITY DEFINER helper function
-- This replaces all recursive SELECT subqueries in staff_roles and users policies with public.is_staff()

BEGIN;

-- 1. Create a helper SECURITY DEFINER function to check if the current user is staff.
-- Since this function runs as the database owner, it bypasses RLS and prevents infinite recursion.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_roles
    WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

-- 2. Drop and recreate the "Staff can view all staff roles" policy using is_staff()
DROP POLICY IF EXISTS "Staff can view all staff roles" ON public.staff_roles;

CREATE POLICY "Staff can view all staff roles" ON public.staff_roles
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- 3. Drop and recreate the "Staff can view all users" policy using is_staff()
DROP POLICY IF EXISTS "Staff can view all users" ON public.users;

CREATE POLICY "Staff can view all users" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- 4. Drop and recreate the "Staff can update any user" policy using is_staff()
DROP POLICY IF EXISTS "Staff can update any user" ON public.users;

CREATE POLICY "Staff can update any user" ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

COMMIT;
