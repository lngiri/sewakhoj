-- Migration 090: Fix staff_roles RLS infinite recursion (v2)
-- =========================================================
-- Problem: The "Staff can view all staff roles" policy on public.staff_roles
-- uses: auth.uid() IN (SELECT user_id FROM public.staff_roles)
-- This causes infinite recursion (42P17) because the policy itself reads
-- from staff_roles while evaluating access to staff_roles.
--
-- Fix: Replace with public.is_staff() — a SECURITY DEFINER function that
-- runs as the owner (bypasses RLS entirely), preventing recursion.
--
-- Also creates the exec_ddl() helper for future DDL migrations.

-- =========================================================
-- Part 1: Create exec_ddl() helper (if not created by 089)
-- =========================================================
CREATE OR REPLACE FUNCTION public.exec_ddl(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  EXECUTE query;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_ddl(TEXT) TO authenticated, service_role;

-- =========================================================
-- Part 2: Fix recursive staff_roles policy
-- =========================================================

-- Drop the recursive policy created by migration 061
DROP POLICY IF EXISTS "Staff can view all staff roles" ON public.staff_roles;

-- Recreate using the SECURITY DEFINER helper (bypasses RLS)
CREATE POLICY "Staff can view all staff roles" ON public.staff_roles
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- =========================================================
-- Part 3: Fix get_tasker_performance_summary() — skill_id → service_id
-- =========================================================
-- Bug: The function references 'skill_id' in two places, but the
-- tasker_skills junction table (migration 048) uses 'service_id' as
-- the foreign key column name. This causes a runtime error:
--   "column "skill_id" does not exist"

CREATE OR REPLACE FUNCTION public.get_tasker_performance_summary(
  p_tasker_id UUID,
  p_months_back INTEGER DEFAULT 1
)
RETURNS TABLE(
  jobs_completed BIGINT,
  jobs_cancelled BIGINT,
  jobs_disputed BIGINT,
  avg_rating NUMERIC,
  total_earnings NUMERIC,
  response_time_avg_seconds NUMERIC,
  category_avg_rating NUMERIC,
  category_rank TEXT
) AS $$
DECLARE
  v_start_date DATE := DATE_TRUNC('month', NOW()) - (p_months_back || ' months')::INTERVAL;
  v_end_date DATE := DATE_TRUNC('month', NOW()) - ((p_months_back - 1) || ' months')::INTERVAL;
  v_tasker_services UUID[];
BEGIN
  -- Get tasker's services (fixed: service_id, not skill_id)
  SELECT ARRAY_AGG(service_id) INTO v_tasker_services
  FROM public.tasker_skills WHERE tasker_id = p_tasker_id;

  RETURN QUERY
  WITH tasker_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE b.status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
      COUNT(*) FILTER (WHERE b.is_disputed = true) AS disputed,
      COALESCE(AVG(r.rating) FILTER (WHERE r.moderation_status = 'approved'), 0) AS rating,
      COALESCE(SUM(b.total_amount) FILTER (WHERE b.status = 'completed'), 0) AS earnings
    FROM public.bookings b
    LEFT JOIN public.reviews r ON r.booking_id = b.id
    WHERE b.tasker_id = p_tasker_id
      AND b.created_at >= v_start_date
      AND b.created_at < v_end_date
  ),
  category_stats AS (
    SELECT COALESCE(AVG(r2.rating) FILTER (WHERE r2.moderation_status = 'approved'), 0) AS cat_rating
    FROM public.bookings b2
    JOIN public.reviews r2 ON r2.booking_id = b2.id
    WHERE b2.tasker_id IN (
      SELECT ts.tasker_id FROM public.tasker_skills ts
      WHERE ts.service_id = ANY(v_tasker_services)  -- fixed: skill_id → service_id
    )
      AND b2.created_at >= v_start_date
      AND b2.created_at < v_end_date
  ),
  response_stats AS (
    SELECT COALESCE(AVG(
      EXTRACT(EPOCH FROM (m.created_at - b3.created_at))
    ), 0) AS resp_time
    FROM public.bookings b3
    JOIN LATERAL (
      SELECT m.created_at FROM public.messages m
      WHERE m.booking_id = b3.id AND m.sender_id = p_tasker_id
      ORDER BY m.created_at ASC LIMIT 1
    ) m ON true
    WHERE b3.tasker_id = p_tasker_id
      AND b3.created_at >= v_start_date
      AND b3.created_at < v_end_date
  )
  SELECT
    ts.completed,
    ts.cancelled,
    ts.disputed,
    ROUND(ts.rating, 2),
    ts.earnings,
    ROUND(rs.resp_time, 1),
    ROUND(cs.cat_rating, 2),
    CASE
      WHEN ts.rating >= cs.cat_rating + 0.5 THEN 'Above Average'
      WHEN ts.rating <= cs.cat_rating - 0.5 THEN 'Below Average'
      ELSE 'Average'
    END
  FROM tasker_stats ts
  CROSS JOIN category_stats cs
  CROSS JOIN response_stats rs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- Part 4: Verify
-- =========================================================
DO $do$
BEGIN
  -- Check that function now compiles (no "column does not exist")
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_tasker_performance_summary') THEN
    RAISE NOTICE '✅ get_tasker_performance_summary() recreated with service_id column references';
  END IF;

  -- Check staff_roles policy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'staff_roles'
    AND policyname = 'Staff can view all staff roles'
    AND qual::text NOT LIKE '%staff_roles%'
  ) THEN
    RAISE NOTICE '✅ staff_roles recursion fixed — policy uses is_staff() instead of self-referencing subquery';
  ELSE
    RAISE WARNING '⚠️ staff_roles policy may still be recursive — check pg_policies';
  END IF;
END $do$;
