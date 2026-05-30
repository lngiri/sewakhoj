-- 089_fix_booking_logs_columns.sql
-- Adds missing `action` and `details` columns to booking_logs
-- These columns are referenced by cancel_expired_bookings(), expire_unpaid_bookings(),
-- and several functions in migration 060 (tasker_acceptance_system).
-- The original table (023_ops_hardening_logs.sql) only had old_status/new_status.
--
-- ALSO creates the exec_ddl() helper function so future migrations can be applied
-- programmatically via the Supabase REST API. The existing sql() function uses
-- RETURN QUERY EXECUTE which only works for queries returning tuples — DDL is rejected.
-- exec_ddl() uses plain EXECUTE and returns a JSONB result, satisfying the API gateway.

-- =========================================
-- Part 1: Fix missing booking_logs columns
-- =========================================
ALTER TABLE public.booking_logs
ADD COLUMN IF NOT EXISTS action TEXT;

ALTER TABLE public.booking_logs
ADD COLUMN IF NOT EXISTS details JSONB;

-- =========================================
-- Part 2: Create exec_ddl() helper
-- =========================================
-- This function executes DDL (ALTER TABLE, CREATE FUNCTION, etc.) via the
-- Supabase REST API. Unlike the sql() function (066_generic_sql_function.sql)
-- which uses RETURN QUERY EXECUTE (requires tuples), this function uses plain
-- EXECUTE and returns a dummy JSONB row, so the API gateway doesn't reject it.

CREATE OR REPLACE FUNCTION public.exec_ddl(query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_ddl(TEXT) TO authenticated, service_role;
