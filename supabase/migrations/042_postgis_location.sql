-- PostGIS Enable + Location Tracking
-- Enable PostGIS extension

CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography point column to taskers for location
ALTER TABLE public.taskers 
ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Index for fast geospatial queries
CREATE INDEX IF NOT EXISTS idx_taskers_location ON public.taskers USING GIST (location);

-- Add district/ward columns for fallback matching
ALTER TABLE public.taskers 
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS ward_number INTEGER;

-- Create function for nearby tasker search
CREATE OR REPLACE FUNCTION search_taskers_nearby(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION,
    service_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    tasker_id UUID,
    user_id UUID,
    full_name TEXT,
    rating NUMERIC,
    hourly_rate NUMERIC,
    distance_km NUMERIC,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as tasker_id,
        t.user_id,
        u.full_name,
        t.rating,
        t.hourly_rate,
        ROUND(ST_Distance(
            t.location, 
            ST_Point(search_lng, search_lat)::geography
        ) / 1000, 1) as distance_km,
        u.avatar_url
    FROM public.taskers t
    JOIN auth.users u ON t.user_id = u.id
    WHERE t.location IS NOT NULL
      AND ST_DWithin(
          t.location, 
          ST_Point(search_lng, search_lat)::geography, 
          radius_km * 1000
      )
      AND (service_category IS NULL OR t.category = service_category)
      AND t.status = 'active'
    ORDER BY distance_km ASC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for district-based fallback search (no GPS)
CREATE OR REPLACE FUNCTION search_taskers_by_district(
    district_name TEXT,
    service_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    tasker_id UUID,
    user_id UUID,
    full_name TEXT,
    rating NUMERIC,
    hourly_rate NUMERIC,
    district TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as tasker_id,
        t.user_id,
        u.full_name,
        t.rating,
        t.hourly_rate,
        t.district
    FROM public.taskers t
    JOIN auth.users u ON t.user_id = u.id
    WHERE t.district = district_name
      AND (service_category IS NULL OR t.category = service_category)
      AND t.status = 'active'
    ORDER BY t.rating DESC NULLS LAST
    LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;