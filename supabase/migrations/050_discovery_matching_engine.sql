-- Migration 050: Discovery & Matching Engine
-- Phase 3 — Trust Score, Elite Status, Proximity Search v2, Service Radius
-- Covers recommendations: #2, #11, #30, #39

-- ============================================================================
-- 1. IMPROVED PROXIMITY SEARCH (replaces 042 version)
--    Fixes: joins public.users instead of auth.users, returns more fields
-- ============================================================================

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
        ROUND(ST_Distance(
            t.location,
            ST_Point(search_lng, search_lat)::geography
        ) / 1000.0, 1) AS distance_km,
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
      -- Service radius filter: only show taskers willing to travel this far
      AND (t.service_radius IS NULL OR t.service_radius >= ROUND(ST_Distance(
          t.location,
          ST_Point(search_lng, search_lat)::geography
      ) / 1000.0))
      AND (service_category IS NULL OR t.skills @> ARRAY[service_category])
    ORDER BY
        COALESCE(t.is_featured, false) DESC,
        COALESCE(t.is_elite, false) DESC,
        COALESCE(t.trust_score, 50) DESC,
        distance_km ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 2. TRUST SCORE COMPUTATION
--    Factors: id_verified (30%), average_rating (25%), completion_count (20%),
--             cancellation_rate penalty (15%), response_time_avg (10%)
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_trust_score(p_tasker_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_id_verified BOOLEAN;
    v_avg_rating NUMERIC;
    v_completion_count INTEGER;
    v_cancellation_count INTEGER;
    v_response_time_avg INTEGER;
    v_total_jobs INTEGER;
    v_score INTEGER;
    v_verified_score INTEGER;
    v_rating_score INTEGER;
    v_completion_score INTEGER;
    v_cancellation_penalty INTEGER;
    v_response_score INTEGER;
BEGIN
    SELECT
        t.id_verified,
        COALESCE(t.average_rating, t.rating, 0),
        COALESCE(t.completion_count, 0),
        COALESCE(t.cancellation_count, 0),
        COALESCE(t.response_time_avg, 0),
        COALESCE(t.total_jobs, 0)
    INTO
        v_id_verified,
        v_avg_rating,
        v_completion_count,
        v_cancellation_count,
        v_response_time_avg,
        v_total_jobs
    FROM public.taskers t
    WHERE t.id = p_tasker_id;

    -- 30% — Identity verification
    v_verified_score := CASE WHEN v_id_verified THEN 30 ELSE 0 END;

    -- 25% — Average rating (0-5 scale → 0-25)
    v_rating_score := LEAST(25, ROUND((v_avg_rating / 5.0) * 25));

    -- 20% — Completion count (0-50+ jobs → 0-20)
    v_completion_score := LEAST(20, ROUND((v_completion_count::NUMERIC / 50.0) * 20));

    -- 15% — Cancellation penalty (0% cancel = 15, 50%+ cancel = 0)
    v_total_jobs := GREATEST(1, v_completion_count + v_cancellation_count);
    v_cancellation_penalty := ROUND((v_cancellation_count::NUMERIC / v_total_jobs::NUMERIC) * 15);
    v_cancellation_penalty := GREATEST(0, 15 - v_cancellation_penalty);

    -- 10% — Response time (0-60 min → 0-10, faster = higher)
    IF v_response_time_avg <= 0 THEN
        v_response_score := 5; -- No data, give half
    ELSIF v_response_time_avg <= 15 THEN
        v_response_score := 10;
    ELSIF v_response_time_avg <= 30 THEN
        v_response_score := 8;
    ELSIF v_response_time_avg <= 60 THEN
        v_response_score := 6;
    ELSIF v_response_time_avg <= 120 THEN
        v_response_score := 4;
    ELSE
        v_response_score := 2;
    END IF;

    v_score := v_verified_score + v_rating_score + v_completion_score + v_cancellation_penalty + v_response_score;

    -- Clamp to 0-100
    v_score := GREATEST(0, LEAST(100, v_score));

    RETURN v_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. TRUST SCORE TRIGGER — recompute on relevant changes
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recompute_trust_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Recompute trust score for the affected tasker
    UPDATE public.taskers
    SET trust_score = compute_trust_score(NEW.tasker_id),
        updated_at = NOW()
    WHERE id = NEW.tasker_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_recompute_trust_score_on_review ON public.reviews;

-- Trigger: when a review is inserted or updated (rating changes)
CREATE TRIGGER trg_recompute_trust_score_on_review
    AFTER INSERT OR UPDATE OF rating ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recompute_trust_score();

-- Trigger: when a booking is completed or cancelled (completion/cancellation counts change)
CREATE OR REPLACE FUNCTION trigger_recompute_trust_score_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('completed', 'cancelled') AND (OLD.status IS NULL OR OLD.status <> NEW.status) THEN
        UPDATE public.taskers
        SET trust_score = compute_trust_score(NEW.tasker_id),
            updated_at = NOW()
        WHERE id = NEW.tasker_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recompute_trust_score_on_booking ON public.bookings;

CREATE TRIGGER trg_recompute_trust_score_on_booking
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recompute_trust_score_on_booking();

-- Trigger: when KYC verification status changes
CREATE OR REPLACE FUNCTION trigger_recompute_trust_score_on_kyc()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_verified IS DISTINCT FROM OLD.id_verified THEN
        UPDATE public.taskers
        SET trust_score = compute_trust_score(NEW.id),
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recompute_trust_score_on_kyc ON public.taskers;

CREATE TRIGGER trg_recompute_trust_score_on_kyc
    AFTER UPDATE OF id_verified ON public.taskers
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recompute_trust_score_on_kyc();

-- ============================================================================
-- 4. ELITE STATUS AUTO-COMPUTATION
--    Elite = completion_count >= 50 AND average_rating >= 4.5
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_elite_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Recompute elite status based on metrics
    UPDATE public.taskers
    SET is_elite = (
        COALESCE(completion_count, 0) >= 50
        AND COALESCE(average_rating, rating, 0) >= 4.5
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.tasker_id, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on booking completion to re-evaluate elite status
DROP TRIGGER IF EXISTS trg_compute_elite_on_booking ON public.bookings;

CREATE TRIGGER trg_compute_elite_on_booking
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION compute_elite_status();

-- Trigger on review to re-evaluate elite status
DROP TRIGGER IF EXISTS trg_compute_elite_on_review ON public.reviews;

CREATE TRIGGER trg_compute_elite_on_review
    AFTER INSERT OR UPDATE OF rating ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION compute_elite_status();

-- ============================================================================
-- 5. INITIALIZE TRUST SCORES FOR EXISTING TASKERS
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.taskers WHERE status = 'active' LOOP
        UPDATE public.taskers
        SET trust_score = compute_trust_score(r.id),
            updated_at = NOW()
        WHERE id = r.id;
    END LOOP;
END $$;

-- ============================================================================
-- 6. INITIALIZE ELITE STATUS FOR EXISTING TASKERS
-- ============================================================================

UPDATE public.taskers
SET is_elite = (
    COALESCE(completion_count, 0) >= 50
    AND COALESCE(average_rating, rating, 0) >= 4.5
),
updated_at = NOW()
WHERE status = 'active';

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION search_taskers_nearby(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION compute_trust_score(UUID) TO authenticated, service_role;
