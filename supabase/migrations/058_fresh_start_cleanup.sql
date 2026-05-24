-- Migration 058: Fresh Start Cleanup
-- Wipes ALL data except admin users (staff_roles entries + users with role='admin')
-- Preserves reference data: services, cities, site_settings, platform_settings, api_integrations, announcements
-- Run this in Supabase SQL Editor

-- ============================================================================
-- WARNING: THIS IS DESTRUCTIVE. BACKUP YOUR DATA FIRST.
-- ============================================================================

DO $$
DECLARE
    admin_user_ids UUID[];
BEGIN
    -- Collect all admin user IDs (from staff_roles + users with role='admin')
    SELECT array_agg(DISTINCT uid) INTO admin_user_ids
    FROM (
        SELECT user_id AS uid FROM public.staff_roles
        UNION
        SELECT id AS uid FROM public.users WHERE role = 'admin'
    ) t;

    RAISE NOTICE 'Preserving % admin user(s): %', array_length(admin_user_ids, 1), admin_user_ids;

    -- Temporarily disable triggers to avoid cascade issues and speed up deletes
    SET session_replication_role = 'replica';

    -- ========================================================================
    -- PHASE 1: Delete child tables that reference bookings
    -- ========================================================================
    DELETE FROM public.reviews;
    DELETE FROM public.messages;
    DELETE FROM public.disputes;
    DELETE FROM public.payments;
    DELETE FROM public.booking_logs;
    DELETE FROM public.commission_ledger;

    -- ========================================================================
    -- PHASE 2: Delete bookings
    -- ========================================================================
    DELETE FROM public.bookings;

    -- ========================================================================
    -- PHASE 3: Delete tables referencing taskers
    -- ========================================================================
    DELETE FROM public.tasker_skills;
    DELETE FROM public.tasker_kyc;
    DELETE FROM public.availability_slots;
    DELETE FROM public.favorites;

    -- ========================================================================
    -- PHASE 4: Delete marketplace tables
    -- ========================================================================
    DELETE FROM public.task_bids;
    DELETE FROM public.market_tasks;
    DELETE FROM public.job_posts;

    -- ========================================================================
    -- PHASE 5: Delete taskers (all of them)
    -- ========================================================================
    DELETE FROM public.taskers;

    -- ========================================================================
    -- PHASE 6: Delete user-related tables
    -- ========================================================================
    DELETE FROM public.onboarding_progress;
    DELETE FROM public.notification_preferences;
    DELETE FROM public.loyalty_points;
    DELETE FROM public.wallet_transactions;
    DELETE FROM public.wallets;
    DELETE FROM public.referrals;
    DELETE FROM public.notifications;
    DELETE FROM public.push_subscriptions;
    DELETE FROM public.tasker_locations;
    DELETE FROM public.system_logs;
    DELETE FROM public.admin_action_log;
    DELETE FROM public.sms_logs;
    DELETE FROM public.promo_codes;

    -- ========================================================================
    -- PHASE 7: Delete non-admin users from public.users
    -- ========================================================================
    IF admin_user_ids IS NOT NULL AND array_length(admin_user_ids, 1) > 0 THEN
        DELETE FROM public.users
        WHERE id NOT IN (SELECT unnest(admin_user_ids));
    ELSE
        DELETE FROM public.users;
    END IF;

    -- ========================================================================
    -- PHASE 8: Delete non-admin users from auth.users
    -- (This works because public.users has ON DELETE CASCADE from auth.users,
    --  but we need to clean auth.users directly for orphaned entries)
    -- ========================================================================
    IF admin_user_ids IS NOT NULL AND array_length(admin_user_ids, 1) > 0 THEN
        DELETE FROM auth.users
        WHERE id NOT IN (SELECT unnest(admin_user_ids));
    ELSE
        -- No admins to preserve — wipe everything
        DELETE FROM auth.users;
    END IF;

    -- Re-enable triggers
    SET session_replication_role = 'origin';

    RAISE NOTICE '✅ Fresh start cleanup complete. Admin users preserved.';
END $$;

-- ============================================================================
-- VERIFICATION: Show remaining data counts
-- ============================================================================
SELECT 'users' AS table_name, COUNT(*) AS remaining FROM public.users
UNION ALL SELECT 'taskers', COUNT(*) FROM public.taskers
UNION ALL SELECT 'bookings', COUNT(*) FROM public.bookings
UNION ALL SELECT 'reviews', COUNT(*) FROM public.reviews
UNION ALL SELECT 'messages', COUNT(*) FROM public.messages
UNION ALL SELECT 'staff_roles', COUNT(*) FROM public.staff_roles
UNION ALL SELECT 'services', COUNT(*) FROM public.services
UNION ALL SELECT 'cities', COUNT(*) FROM public.cities
ORDER BY table_name;
