-- Fix for Infinite Recursion in staff_roles policies

-- 1. Create a SECURITY DEFINER function to bypass RLS while checking if the user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the broken recursive policy
DROP POLICY IF EXISTS "Super Admins can read all staff roles" ON public.staff_roles;

-- 3. Create the new fixed policy that uses the function instead of a direct table query
CREATE POLICY "Super Admins can read all staff roles" ON public.staff_roles
  FOR ALL USING ( public.is_super_admin() );
