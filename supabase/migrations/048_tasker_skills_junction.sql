-- 048_tasker_skills_junction.sql
-- Phase 1.3: Tasker Skills Junction Table
-- Replaces taskers.skills TEXT[] with proper referential integrity

-- ============================================================================
-- 1. CREATE JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tasker_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  skill_level TEXT DEFAULT 'Intermediate' CHECK (skill_level IN ('Beginner', 'Intermediate', 'Expert')),
  hourly_rate INTEGER, -- per-service pricing override (falls back to taskers.hourly_rate)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tasker_id, service_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasker_skills_tasker ON public.tasker_skills(tasker_id);
CREATE INDEX IF NOT EXISTS idx_tasker_skills_service ON public.tasker_skills(service_id);

-- ============================================================================
-- 2. MIGRATE EXISTING DATA FROM taskers.skills[]
-- ============================================================================

-- Insert existing skills into junction table
-- taskers.skills stores service UUIDs as TEXT[]
INSERT INTO public.tasker_skills (tasker_id, service_id, skill_level)
SELECT
  t.id AS tasker_id,
  skill_uuid::UUID AS service_id,
  'Intermediate' AS skill_level
FROM public.taskers t,
  unnest(t.skills) AS skill_uuid
WHERE t.skills IS NOT NULL
  AND array_length(t.skills, 1) > 0
  AND skill_uuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT (tasker_id, service_id) DO NOTHING;

-- ============================================================================
-- 3. SYNC TRIGGER: tasker_skills → taskers.skills[] (backward compatibility)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_tasker_skills_to_array()
RETURNS TRIGGER AS $$
DECLARE
  skill_array TEXT[];
BEGIN
  -- Rebuild the skills array from junction table
  SELECT array_agg(service_id::TEXT) INTO skill_array
  FROM public.tasker_skills
  WHERE tasker_id = COALESCE(NEW.tasker_id, OLD.tasker_id);

  UPDATE public.taskers
  SET
    skills = COALESCE(skill_array, ARRAY[]::TEXT[]),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.tasker_id, OLD.tasker_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_tasker_skills_insert ON public.tasker_skills;
CREATE TRIGGER trigger_sync_tasker_skills_insert
  AFTER INSERT OR UPDATE OR DELETE ON public.tasker_skills
  FOR EACH ROW
  EXECUTE FUNCTION sync_tasker_skills_to_array();

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE public.tasker_skills ENABLE ROW LEVEL SECURITY;

-- Taskers can manage their own skills
CREATE POLICY "Taskers manage own skills"
  ON public.tasker_skills FOR ALL
  USING (
    tasker_id IN (SELECT id FROM public.taskers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tasker_id IN (SELECT id FROM public.taskers WHERE user_id = auth.uid())
  );

-- Everyone can view tasker skills
CREATE POLICY "Anyone can view tasker skills"
  ON public.tasker_skills FOR SELECT
  USING (true);

-- ============================================================================
-- 5. HELPER FUNCTION: Get tasker skills with service details
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tasker_skills_with_details(p_tasker_id UUID)
RETURNS TABLE (
  service_id UUID,
  service_name TEXT,
  service_name_ne TEXT,
  service_icon TEXT,
  skill_level TEXT,
  hourly_rate INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.service_id,
    s.name AS service_name,
    s.name_ne AS service_name_ne,
    s.icon AS service_icon,
    ts.skill_level,
    COALESCE(ts.hourly_rate, t.hourly_rate) AS hourly_rate
  FROM public.tasker_skills ts
  JOIN public.services s ON s.id = ts.service_id
  JOIN public.taskers t ON t.id = ts.tasker_id
  WHERE ts.tasker_id = p_tasker_id
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql STABLE;
