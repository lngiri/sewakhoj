-- 066_generic_sql_function.sql
-- Adds a helper RPC to allow the client to run arbitrary read‑only SQL queries.
-- This is useful for diagnostics (listing columns, triggers, storage buckets, policies, etc.)
-- Use with caution – the function is SECURITY DEFINER and only returns JSONB.

CREATE OR REPLACE FUNCTION public.sql(query TEXT)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE query;
END;
$$;

-- Grant execute permission to the anon and service_role keys
GRANT EXECUTE ON FUNCTION public.sql(TEXT) TO authenticated, service_role;
