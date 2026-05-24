-- Migration 081: Trust Score Breakdown Function
-- Adds a detailed breakdown function for the trust score computation

-- ============================================================================
-- 1. Detailed Trust Score Breakdown (for UI display)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_trust_score_breakdown(p_tasker_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_tasker RECORD;
    v_breakdown JSONB;
    v_total_jobs INTEGER;
    v_verified_score INTEGER;
    v_rating_score INTEGER;
    v_completion_score INTEGER;
    v_cancellation_penalty INTEGER;
    v_response_score INTEGER;
    v_total INTEGER;
BEGIN
    -- Fetch tasker data
    SELECT
        t.id_verified,
        COALESCE(t.average_rating, t.rating, 0) AS avg_rating,
        COALESCE(t.completion_count, 0) AS completion_count,
        COALESCE(t.cancellation_count, 0) AS cancellation_count,
        COALESCE(t.response_time_avg, 0) AS response_time_avg,
        COALESCE(t.total_jobs, 0) AS total_jobs,
        COALESCE(t.trust_score, 50) AS trust_score
    INTO v_tasker
    FROM public.taskers t
    WHERE t.id = p_tasker_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Compute individual factors
    -- 30% — Identity verification
    v_verified_score := CASE WHEN v_tasker.id_verified THEN 30 ELSE 0 END;

    -- 25% — Average rating (0-5 scale → 0-25)
    v_rating_score := LEAST(25, ROUND((v_tasker.avg_rating / 5.0) * 25));

    -- 20% — Completion count (0-50+ jobs → 0-20)
    v_completion_score := LEAST(20, ROUND((v_tasker.completion_count::NUMERIC / 50.0) * 20));

    -- 15% — Cancellation penalty (0% cancel = 15, 50%+ cancel = 0)
    v_total_jobs := GREATEST(1, v_tasker.completion_count + v_tasker.cancellation_count);
    v_cancellation_penalty := ROUND((v_tasker.cancellation_count::NUMERIC / v_total_jobs::NUMERIC) * 15);
    v_cancellation_penalty := GREATEST(0, 15 - v_cancellation_penalty);

    -- 10% — Response time (0-60 min → 0-10, faster = higher)
    IF v_tasker.response_time_avg <= 0 THEN
        v_response_score := 5;
    ELSIF v_tasker.response_time_avg <= 15 THEN
        v_response_score := 10;
    ELSIF v_tasker.response_time_avg <= 30 THEN
        v_response_score := 8;
    ELSIF v_tasker.response_time_avg <= 60 THEN
        v_response_score := 6;
    ELSIF v_tasker.response_time_avg <= 120 THEN
        v_response_score := 4;
    ELSE
        v_response_score := 2;
    END IF;

    v_total := v_verified_score + v_rating_score + v_completion_score + v_cancellation_penalty + v_response_score;
    v_total := GREATEST(0, LEAST(100, v_total));

    -- Build breakdown JSON
    v_breakdown := jsonb_build_object(
        'overall_score', v_total,
        'factors', jsonb_build_array(
            jsonb_build_object(
                'name', 'Identity Verification',
                'icon', 'shield',
                'weight', 30,
                'score', v_verified_score,
                'max_score', 30,
                'status', CASE WHEN v_tasker.id_verified THEN 'verified' ELSE 'unverified' END,
                'description', CASE WHEN v_tasker.id_verified THEN 'ID verified via KYC process' ELSE 'ID verification pending' END
            ),
            jsonb_build_object(
                'name', 'Quality Rating',
                'icon', 'star',
                'weight', 25,
                'score', v_rating_score,
                'max_score', 25,
                'status', CASE
                    WHEN v_tasker.avg_rating >= 4.5 THEN 'excellent'
                    WHEN v_tasker.avg_rating >= 4.0 THEN 'good'
                    WHEN v_tasker.avg_rating >= 3.0 THEN 'average'
                    ELSE 'needs_improvement'
                END,
                'description', 'Average rating: ' || ROUND(v_tasker.avg_rating, 1) || ' / 5.0'
            ),
            jsonb_build_object(
                'name', 'Completion Experience',
                'icon', 'briefcase',
                'weight', 20,
                'score', v_completion_score,
                'max_score', 20,
                'status', CASE
                    WHEN v_tasker.completion_count >= 50 THEN 'excellent'
                    WHEN v_tasker.completion_count >= 20 THEN 'good'
                    WHEN v_tasker.completion_count >= 10 THEN 'average'
                    ELSE 'needs_improvement'
                END,
                'description', v_tasker.completion_count || ' jobs completed'
            ),
            jsonb_build_object(
                'name', 'Cancellation Rate',
                'icon', 'x-circle',
                'weight', 15,
                'score', v_cancellation_penalty,
                'max_score', 15,
                'status', CASE
                    WHEN v_cancellation_penalty >= 13 THEN 'excellent'
                    WHEN v_cancellation_penalty >= 10 THEN 'good'
                    WHEN v_cancellation_penalty >= 7 THEN 'average'
                    ELSE 'needs_improvement'
                END,
                'description', CASE
                    WHEN v_tasker.cancellation_count = 0 THEN 'No cancellations'
                    ELSE ROUND((v_tasker.cancellation_count::NUMERIC / v_total_jobs::NUMERIC) * 100, 1) || '% cancellation rate'
                END
            ),
            jsonb_build_object(
                'name', 'Response Time',
                'icon', 'clock',
                'weight', 10,
                'score', v_response_score,
                'max_score', 10,
                'status', CASE
                    WHEN v_response_score >= 8 THEN 'excellent'
                    WHEN v_response_score >= 6 THEN 'good'
                    WHEN v_response_score >= 4 THEN 'average'
                    ELSE 'needs_improvement'
                END,
                'description', CASE
                    WHEN v_tasker.response_time_avg <= 0 THEN 'No response data yet'
                    WHEN v_tasker.response_time_avg <= 60 THEN v_tasker.response_time_avg || 's avg response'
                    ELSE ROUND(v_tasker.response_time_avg / 60, 1) || ' min avg response'
                END
            )
        ),
        'raw_metrics', jsonb_build_object(
            'average_rating', v_tasker.avg_rating,
            'completion_count', v_tasker.completion_count,
            'cancellation_count', v_tasker.cancellation_count,
            'response_time_avg', v_tasker.response_time_avg,
            'total_jobs', v_tasker.total_jobs,
            'id_verified', v_tasker.id_verified
        ),
        'tier', CASE
            WHEN v_total >= 80 THEN 'excellent'
            WHEN v_total >= 60 THEN 'good'
            WHEN v_total >= 40 THEN 'average'
            ELSE 'needs_improvement'
        END
    );

    RETURN v_breakdown;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_trust_score_breakdown(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_trust_score_breakdown IS 'Returns a detailed JSON breakdown of the trust score computation for a tasker, including individual factor scores and raw metrics.';
