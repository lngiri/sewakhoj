-- ============================================================================
-- Migration 065: pg_cron Job Scheduling
-- ============================================================================
-- Purpose: Schedule the cron jobs that power the weekly schedule auto-toggle system.
--
-- Jobs:
--   1. auto_toggle_tasker_online — runs every 1 minute
--      Toggles is_online for each active tasker based on their weekly schedule
--      and blocked_days, according to current Nepal time (Asia/Kathmandu).
--
--   2. cleanup_past_blocked_days — runs daily at 00:05 NST (18:40 UTC)
--      Removes blocked_days entries for dates that have passed.
--
-- Prerequisites:
--   - pg_cron extension must be enabled (Supabase Pro/Team plan)
--   - Migration 064 must be applied first (functions exist)
--   - Functions are SECURITY DEFINER, owned by superuser — safe for cron
--
-- ============================================================================

-- 1. Enable pg_cron extension (idempotent)
--    NOTE: On Supabase, this may already be enabled. We check first.
-- ============================================================================
DO $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    -- Only create extension if not already present
    PERFORM 1 FROM pg_extension WHERE extname = 'pg_cron';
    IF NOT FOUND THEN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      RAISE NOTICE 'pg_cron extension enabled.';
    ELSE
      RAISE NOTICE 'pg_cron extension already enabled.';
    END IF;
  ELSE
    RAISE WARNING 'pg_cron is not available on this PostgreSQL instance. '
      'Cron jobs will need to be scheduled via an external scheduler (e.g., Supabase Edge Functions, Vercel Cron).';
  END IF;
END $$;

-- 2. Schedule: auto_toggle_tasker_online() every 1 minute
--    Uses Asia/Kathmandu timezone awareness inside the function itself.
--    Cron expression: * * * * * (every minute)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if re-running migration
    PERFORM cron.unschedule('auto-toggle-tasker-online');

    PERFORM cron.schedule(
      'auto-toggle-tasker-online',   -- job_name (must be unique)
      '* * * * *',                    -- schedule: every minute
      $$SELECT public.auto_toggle_tasker_online();$$
    );

    RAISE NOTICE 'Cron job "auto-toggle-tasker-online" scheduled: every minute.';
  END IF;
END $$;

-- 3. Schedule: cleanup_past_blocked_days() daily at midnight NST
--    Midnight NST = 18:15 UTC (NST is UTC+5:45)
--    Cron expression: 15 18 * * * (18:15 UTC every day)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if re-running migration
    PERFORM cron.unschedule('cleanup-blocked-days');

    PERFORM cron.schedule(
      'cleanup-blocked-days',        -- job_name (must be unique)
      '15 18 * * *',                  -- schedule: 18:15 UTC = 00:00 NST daily
      $$SELECT public.cleanup_past_blocked_days();$$
    );

    RAISE NOTICE 'Cron job "cleanup-blocked-days" scheduled: daily at 00:00 NST (18:15 UTC).';
  END IF;
END $$;

-- 4. Verify scheduled jobs
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '--- Active Cron Jobs ---';
  END IF;
END $$;

-- Select to show all cron jobs (works even without pg_cron, just returns empty)
SELECT jobname, schedule, command, active
FROM cron.job
WHERE jobname IN ('auto-toggle-tasker-online', 'cleanup-blocked-days');

-- ============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT:
--
-- If pg_cron is NOT available (Supabase Free tier):
--   1. Use Vercel Cron Jobs to call the same functions via API
--   2. Or use Supabase Edge Functions with a scheduled trigger
--   3. Create a health-check endpoint that calls these functions
--
-- For the Vercel Cron fallback pattern, add to vercel.json:
--   {
--     "crons": [
--       {
--         "path": "/api/cron/toggle-online",
--         "schedule": "* * * * *"
--       },
--       {
--         "path": "/api/cron/cleanup-blocked-days",
--         "schedule": "15 18 * * *"
--       }
--     ]
--   }
--
-- And create two API routes:
--   - src/app/api/cron/toggle-online/route.ts
--   - src/app/api/cron/cleanup-blocked-days/route.ts
--   Each authenticates via CRON_SECRET header and calls the DB function via supabase.rpc()
-- ============================================================================