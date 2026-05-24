-- 083_guard_tasker_skills_column.sql
-- Phase 1.10: Guard taskers.skills from direct writes
-- The tasker_skills junction table (migration 048) is the canonical source.
-- The sync_tasker_skills_to_array trigger keeps taskers.skills[] in sync.
-- This trigger prevents accidental direct writes to the array column.

CREATE OR REPLACE FUNCTION public.guard_tasker_skills_column()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.skills IS DISTINCT FROM OLD.skills THEN
    RAISE WARNING 'Direct write to taskers.skills detected (tasker_id: %). Use public.tasker_skills junction table instead.',
      COALESCE(NEW.id, OLD.id);
    -- Restore old value — junction trigger is the only allowed writer
    NEW.skills = OLD.skills;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_tasker_skills ON public.taskers;
CREATE TRIGGER trg_guard_tasker_skills
  BEFORE UPDATE OF skills ON public.taskers
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_tasker_skills_column();

COMMENT ON FUNCTION public.guard_tasker_skills_column() IS
  'Phase 1.10: Prevents direct writes to taskers.skills[]. Use tasker_skills junction table.';

COMMENT ON TRIGGER trg_guard_tasker_skills ON public.taskers IS
  'Phase 1.10: Guards against accidental direct writes to the skills array column.';
