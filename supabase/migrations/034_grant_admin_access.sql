-- Grant Super Admin access to sewakhoj@gmail.com
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user ID for the specified email
    SELECT id INTO target_user_id FROM public.users WHERE email = 'sewakhoj@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- Insert into staff_roles if not already present
        INSERT INTO public.staff_roles (user_id, role)
        VALUES (target_user_id, 'super_admin')
        ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

        -- Also ensure they have the 'admin' role in the regular users table for UI flags
        UPDATE public.users SET role = 'admin' WHERE id = target_user_id;

        RAISE NOTICE 'Successfully granted super_admin role to sewakhoj@gmail.com';
    ELSE
        RAISE NOTICE 'User with email sewakhoj@gmail.com not found in public.users table';
    END IF;
END $$;
