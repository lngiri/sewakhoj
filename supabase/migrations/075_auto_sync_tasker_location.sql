-- Migration 075: Auto-populate PostGIS geography location from lat/lng
-- Ensures taskers.location is always in sync with last_lat/last_long
-- Required for search_taskers_nearby() to return results

-- ============================================================================
-- 1. TRIGGER FUNCTION: sync last_lat/last_long → location geography column
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_tasker_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_lat IS NOT NULL AND NEW.last_long IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.last_long, NEW.last_lat), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_tasker_location ON public.taskers;

CREATE TRIGGER trg_sync_tasker_location
    BEFORE INSERT OR UPDATE OF last_lat, last_long ON public.taskers
    FOR EACH ROW
    EXECUTE FUNCTION sync_tasker_location();

-- ============================================================================
-- 2. BACKFILL: Populate location for existing taskers with lat/lng data
-- ============================================================================

UPDATE public.taskers 
SET location = ST_SetSRID(ST_MakePoint(last_long, last_lat), 4326)::geography
WHERE last_lat IS NOT NULL AND last_long IS NOT NULL AND location IS NULL;

-- ============================================================================
-- 3. GRANT EXECUTION
-- ============================================================================

GRANT EXECUTE ON FUNCTION sync_tasker_location() TO anon, authenticated, service_role;