-- Migration 057: Platform Hardening (Phase 10)
-- Covers: 10.1 Service-Level Pricing
-- Created for: SewaKhoj Marketplace Intelligence

-- ============================================================================
-- 10.1: Service-Level Pricing — add hourly_rate to tasker_skills junction
-- ============================================================================

-- Add per-service pricing to tasker_skills junction table
ALTER TABLE public.tasker_skills
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2);

-- Function to get effective hourly rate for a tasker+skill combination
-- Falls back to taskers.hourly_rate if no per-skill rate is set
CREATE OR REPLACE FUNCTION public.get_effective_rate(
  p_tasker_id UUID,
  p_skill_id UUID
)
RETURNS NUMERIC(10,2) AS $$
DECLARE
  v_skill_rate NUMERIC(10,2);
  v_default_rate NUMERIC(10,2);
BEGIN
  -- Try per-skill rate first
  SELECT ts.hourly_rate INTO v_skill_rate
  FROM public.tasker_skills ts
  WHERE ts.tasker_id = p_tasker_id AND ts.service_id = p_skill_id;

  IF v_skill_rate IS NOT NULL AND v_skill_rate > 0 THEN
    RETURN v_skill_rate;
  END IF;

  -- Fall back to default hourly rate
  SELECT t.hourly_rate INTO v_default_rate
  FROM public.taskers t
  WHERE t.id = p_tasker_id;

  RETURN COALESCE(v_default_rate, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tasker_skills_rate ON public.tasker_skills(tasker_id, service_id) WHERE hourly_rate IS NOT NULL;
