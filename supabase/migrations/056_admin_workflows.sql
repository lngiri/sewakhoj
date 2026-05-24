-- Migration 056: Admin Workflows & Operations (Phase 9)
-- Covers: 9.1 Admin Action Approval, 9.3 Dispute SLA Tracking, 9.4 Availability Structured Storage
-- Created for: SewaKhoj Marketplace Intelligence

-- ============================================================================
-- 9.1: Admin Action Approval Workflow
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN ('approve_tasker', 'process_payout', 'resolve_dispute', 'reject_tasker', 'adjust_trust_score', 'delete_content')),
  target_id UUID NOT NULL,
  target_description TEXT,
  requested_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view action log" ON public.admin_action_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can insert action log" ON public.admin_action_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can update action log" ON public.admin_action_log
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Function to check if an action requires dual approval
CREATE OR REPLACE FUNCTION public.requires_dual_approval(
  p_action_type TEXT,
  p_amount NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Payouts > NPR 10,000 require dual approval
  IF p_action_type = 'process_payout' AND p_amount > 10000 THEN
    RETURN TRUE;
  END IF;

  -- Tasker approval always requires dual approval
  IF p_action_type = 'approve_tasker' THEN
    RETURN TRUE;
  END IF;

  -- Dispute resolution with refund requires dual approval
  IF p_action_type = 'resolve_dispute' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get pending approvals for an admin
CREATE OR REPLACE FUNCTION public.get_pending_approvals()
RETURNS TABLE(
  log_id UUID,
  action_type TEXT,
  target_id UUID,
  target_description TEXT,
  requested_by_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ,
  age_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.action_type,
    al.target_id,
    al.target_description,
    u.full_name,
    al.details,
    al.created_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - al.created_at)) / 3600, 1)
  FROM public.admin_action_log al
  LEFT JOIN public.users u ON al.requested_by = u.id
  WHERE al.status = 'pending'
    AND al.requested_by != auth.uid() -- Can't approve your own requests
  ORDER BY al.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9.3: Dispute Resolution SLA Tracking
-- ============================================================================

-- Add SLA columns to disputes
ALTER TABLE public.disputes
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0 CHECK (escalation_level >= 0 AND escalation_level <= 3);

-- Set SLA deadline for existing open disputes (72 hours from creation)
UPDATE public.disputes
SET sla_deadline = created_at + INTERVAL '72 hours'
WHERE sla_deadline IS NULL AND status = 'open';

-- Function to auto-escalate disputes approaching SLA
CREATE OR REPLACE FUNCTION public.check_dispute_sla()
RETURNS TABLE(
  dispute_id UUID,
  booking_id UUID,
  reason TEXT,
  sla_deadline TIMESTAMPTZ,
  hours_remaining NUMERIC,
  escalation_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.booking_id,
    d.reason,
    d.sla_deadline,
    ROUND(EXTRACT(EPOCH FROM (d.sla_deadline - NOW())) / 3600, 1),
    d.escalation_level
  FROM public.disputes d
  WHERE d.status = 'open'
    AND d.sla_deadline IS NOT NULL
    AND d.sla_deadline < NOW() + INTERVAL '12 hours' -- Within 12 hours of deadline
    AND d.escalation_level < 3
  ORDER BY d.sla_deadline ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set SLA deadline on new disputes
CREATE OR REPLACE FUNCTION public.set_dispute_sla()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sla_deadline := COALESCE(NEW.sla_deadline, NOW() + INTERVAL '72 hours');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_dispute_sla ON public.disputes;
CREATE TRIGGER trg_set_dispute_sla
  BEFORE INSERT ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_dispute_sla();

-- ============================================================================
-- 9.4: Availability Structured Storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  slot TEXT CHECK (slot IN ('morning', 'afternoon', 'evening')),
  UNIQUE(tasker_id, day_of_week, slot)
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability slots" ON public.availability_slots
  FOR SELECT USING (true);

CREATE POLICY "Taskers can manage their own slots" ON public.availability_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.taskers WHERE id = availability_slots.tasker_id AND user_id = auth.uid())
  );

-- Function to sync availability_hours JSON to availability_slots
CREATE OR REPLACE FUNCTION public.sync_availability_slots(
  p_tasker_id UUID,
  p_availability_hours JSONB
)
RETURNS VOID AS $$
DECLARE
  day_names TEXT[] := ARRAY['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  slot_names TEXT[] := ARRAY['morning', 'afternoon', 'evening'];
  day_idx INTEGER;
  slot_name TEXT;
BEGIN
  -- Delete existing slots for this tasker
  DELETE FROM public.availability_slots WHERE tasker_id = p_tasker_id;

  -- Insert new slots from JSON
  FOR day_idx IN 0..6 LOOP
    FOR slot_name IN SELECT unnest(slot_names) LOOP
      IF p_availability_hours -> day_names[day_idx + 1] ? slot_name THEN
        INSERT INTO public.availability_slots (tasker_id, day_of_week, slot)
        VALUES (p_tasker_id, day_idx, slot_name)
        ON CONFLICT (tasker_id, day_of_week, slot) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-sync when taskers.availability_hours is updated
CREATE OR REPLACE FUNCTION public.auto_sync_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.availability_hours IS DISTINCT FROM OLD.availability_hours THEN
    PERFORM public.sync_availability_slots(NEW.id, NEW.availability_hours);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_sync_availability ON public.taskers;
CREATE TRIGGER trg_auto_sync_availability
  AFTER UPDATE ON public.taskers
  FOR EACH ROW EXECUTE FUNCTION public.auto_sync_availability();

-- Function to find taskers available at a specific day/time
CREATE OR REPLACE FUNCTION public.find_available_taskers(
  p_day_of_week INTEGER,
  p_slot TEXT,
  p_skill_id UUID DEFAULT NULL
)
RETURNS TABLE(
  tasker_id UUID,
  full_name TEXT,
  hourly_rate NUMERIC,
  trust_score INTEGER,
  average_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    t.id,
    u.full_name,
    t.hourly_rate,
    t.trust_score,
    t.average_rating
  FROM public.availability_slots av
  JOIN public.taskers t ON av.tasker_id = t.id
  JOIN public.users u ON t.user_id = u.id
  WHERE av.day_of_week = p_day_of_week
    AND av.slot = p_slot
    AND t.status = 'active'
    AND (p_skill_id IS NULL OR t.skills ? p_skill_id::text)
  ORDER BY t.trust_score DESC NULLS LAST, t.average_rating DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_action_log_status ON public.admin_action_log(status);
CREATE INDEX IF NOT EXISTS idx_admin_action_log_type ON public.admin_action_log(action_type);
CREATE INDEX IF NOT EXISTS idx_disputes_sla ON public.disputes(sla_deadline) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_availability_slots_lookup ON public.availability_slots(day_of_week, slot);
CREATE INDEX IF NOT EXISTS idx_availability_slots_tasker ON public.availability_slots(tasker_id);
