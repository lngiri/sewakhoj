-- Migration 086: Create SECURITY DEFINER function for admin user directory
-- Bypasses RLS to allow staff to view all users with their tasker and staff role data
-- This fixes the blank table on /admin/users caused by nested staff_roles(role) join failing under RLS

-- Drop if exists for idempotency
DROP FUNCTION IF EXISTS public.admin_get_all_users();

CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Ensure only staff members can call this
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Access denied: not a staff member';
  END IF;

  SELECT COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', u.id,
        'full_name', u.full_name,
        'email', u.email,
        'phone', u.phone,
        'avatar_url', u.avatar_url,
        'role', u.role,
        'account_status', u.account_status,
        'created_at', u.created_at,
        'taskers', COALESCE(
          (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', t.id, 'status', t.status, 'id_verified', t.id_verified))
           FROM public.taskers t WHERE t.user_id = u.id),
          '[]'::JSONB
        ),
        'staff_roles', COALESCE(
          (SELECT JSONB_AGG(JSONB_BUILD_OBJECT('role', sr.role))
           FROM public.staff_roles sr WHERE sr.user_id = u.id),
          '[]'::JSONB
        )
      )
      ORDER BY u.created_at DESC
    ),
    '[]'::JSONB
  ) INTO result
  FROM public.users u;

  RETURN result;
END;
$$;

-- Grant execute to authenticated users (staff check is done inside the function)
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
