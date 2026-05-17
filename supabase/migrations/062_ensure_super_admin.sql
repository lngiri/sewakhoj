-- Migration 062: Ensure sewakhoj@gmail.com is super_admin
-- Some cleanup operations or manual changes may have removed the super_admin role.
-- This migration re-ensures the owner account has super_admin privileges.

-- ============================================================================
-- 1. FIND USER BY EMAIL AND RE-INSERT INTO staff_roles
-- ============================================================================

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user by email
    SELECT id INTO target_user_id
    FROM public.users
    WHERE email = 'sewakhoj@gmail.com';

    -- Also try finding in auth.users if not in public.users
    IF target_user_id IS NULL THEN
        SELECT id INTO target_user_id
        FROM auth.users
        WHERE email = 'sewakhoj@gmail.com';
    END IF;

    IF target_user_id IS NOT NULL THEN
        -- Re-insert into staff_roles (upsert) — this is separate from users.role
        -- which only allows 'customer' or 'tasker' per CHECK constraint
        INSERT INTO public.staff_roles (user_id, role)
        VALUES (target_user_id, 'super_admin')
        ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

        RAISE NOTICE '✅ super_admin restored for user_id: %', target_user_id;
    ELSE
        RAISE WARNING '⚠️ User sewakhoj@gmail.com not found in users or auth.users';
    END IF;
END $$;