-- Fix: PostGIS ROUND(double precision, integer) does not exist
-- The old function from migration 042 used ROUND(ST_Distance(...) / 1000, 1)
-- where ST_Distance returns double precision. PostgreSQL only supports
-- ROUND(numeric, integer), not ROUND(double, integer).
--
-- Run this against your Supabase database if migration 050 has not been
-- applied, or if the old function still exists with the wrong signature.

DROP FUNCTION IF EXISTS search_taskers_nearby(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT);

CREATE OR REPLACE FUNCTION search_taskers_nearby(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 10,
    service_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    tasker_id UUID,
    user_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    rating NUMERIC,
    hourly_rate NUMERIC,
    distance_km NUMERIC,
    skills TEXT[],
    bio TEXT,
    city TEXT,
    is_featured BOOLEAN,
    is_elite BOOLEAN,
    trust_score INTEGER,
    completion_count INTEGER,
    service_radius INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id AS tasker_id,
        t.user_id,
        u.full_name,
        u.avatar_url,
        COALESCE(t.average_rating, t.rating, 0) AS rating,
        t.hourly_rate,
        -- Cast to numeric before ROUND to avoid "function round(double precision, integer) does not exist"
        ROUND((ST_Distance(
            t.location,
            ST_Point(search_lng, search_lat)::geography
        ) / 1000.0)::numeric, 1) AS distance_km,
        t.skills,
        t.bio,
        t.city,
        COALESCE(t.is_featured, false) AS is_featured,
        COALESCE(t.is_elite, false) AS is_elite,
        COALESCE(t.trust_score, 50) AS trust_score,
        COALESCE(t.completion_count, 0) AS completion_count,
        COALESCE(t.service_radius, 10) AS service_radius
    FROM public.taskers t
    JOIN public.users u ON t.user_id = u.id
    WHERE t.location IS NOT NULL
      AND t.status = 'active'
      AND ST_DWithin(
          t.location,
          ST_Point(search_lng, search_lat)::geography,
          radius_km * 1000
      )
      -- Cast to numeric before ROUND here too
      AND (t.service_radius IS NULL OR t.service_radius >= ROUND((ST_Distance(
          t.location,
          ST_Point(search_lng, search_lat)::geography
      ) / 1000.0)::numeric, 1))
      AND (service_category IS NULL OR t.skills @> ARRAY[service_category])
    ORDER BY
        COALESCE(t.is_featured, false) DESC,
        COALESCE(t.is_elite, false) DESC,
        COALESCE(t.trust_score, 50) DESC,
        distance_km ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION search_taskers_nearby(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO anon, authenticated, service_role;
