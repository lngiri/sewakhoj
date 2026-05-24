-- Migration 063: Create SECURITY DEFINER function for staff role lookup
-- This bypasses RLS entirely, solving the chicken-and-egg problem where
-- checkAdmin() in dashboard/page.tsx needs to read staff_roles but RLS
-- requires the user to already be in staff_roles to read ANY row.
--
-- Even though migration 061 added "Staff can view all staff roles" policy,
-- the original "Users can read their own staff role" policy from migration 004
-- uses auth.uid() = user_id which should work — but a SECURITY DEFINER function
-- is the industry-standard pattern for admin auth checks.
--
-- CRITICAL: In PostgreSQL RLS, if both permissive AND restrictive policies exist,
-- restrictive wins. A SECURITY DEFINER function is immune to RLS entirely.

DO $$
BEGIN
    -- 1. Drop existing if any (for idempotency)
    DROP FUNCTION IF EXISTS public.get_my_staff_role();

    -- 2. Create SECURITY DEFINER function — runs as the table owner, bypasses RLS
    CREATE OR REPLACE FUNCTION public.get_my_staff_role()
    RETURNS TABLE(role TEXT)
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = ''
    AS $$
        SELECT sr.role::TEXT
        FROM public.staff_roles sr
        WHERE sr.user_id = auth.uid();
    $$;

    -- 3. Grant execute to authenticated users
    GRANT EXECUTE ON FUNCTION public.get_my_staff_role() TO authenticated;

    RAISE NOTICE '✅ Migration 063 applied: get_my_staff_role() SECURITY DEFINER function created';
END $$;
