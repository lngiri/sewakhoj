-- Fix for the SECOND Infinite Recursion policy in staff_roles

-- Drop the second broken recursive policy
DROP POLICY IF EXISTS "Super Admins can manage staff roles" ON public.staff_roles;

-- Replace it with the safe policy using our previously created helper function
CREATE POLICY "Super Admins can manage staff roles" ON public.staff_roles
  FOR ALL USING ( public.is_super_admin() );
