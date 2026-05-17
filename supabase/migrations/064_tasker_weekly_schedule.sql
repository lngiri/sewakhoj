-- Migration 064: Tasker Weekly Schedule & Auto Online/Offline System
-- Phase 1 of: Tasker Weekly Schedule Plan (plans/tasker-weekly-schedule-plan.md)
--
-- Covers:
--   1. tasker_weekly_schedule table — per-day {enabled, start, end} JSONB
--   2. is_online column on taskers — auto-toggled by cron
--   3. tasker_blocked_days table — emergency leave / block entire day
--   4. auto_toggle_tasker_online() — cron function, checks schedule + blocked_days
--   5. get_available_slots() — returns 1-hour slots within schedule, minus bookings
--   6. validate_booking_schedule() — trigger: booking must fall within schedule + not blocked
--   7. Backfill: convert existing availability_hours → tasker_weekly_schedule
--   8. Indexes + RLS policies + grants
--
-- Timezone: All cron functions use AT TIME ZONE 'Asia/Kathmandu' (UTC+5:45, no DST)

BEGIN;

-- ============================================================================
-- 1. ADD is_online COLUMN TO taskers
-- ============================================================================

ALTER TABLE public.taskers
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.taskers.is_online IS 'Auto-toggled by auto_toggle_tasker_online() cron. TRUE when within scheduled hours on an enabled day and not blocked.';

-- Index for efficient online-tasker queries (admin live-map, browse filter)
CREATE INDEX IF NOT EXISTS idx_taskers_is_online ON public.taskers(is_online) WHERE is_online = true;

-- ============================================================================
-- 2. CREATE tasker_weekly_schedule TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tasker_weekly_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE UNIQUE,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure:
  -- {
  --   "0": {"enabled": false},
  --   "1": {"enabled": true,  "start": "09:00", "end": "18:00"},
  --   "2": {"enabled": true,  "start": "09:00", "end": "18:00"},
  --   "3": {"enabled": true,  "start": "09:00", "end": "18:00"},
  --   "4": {"enabled": true,  "start": "09:00", "end": "18:00"},
  --   "5": {"enabled": true,  "start": "09:00", "end": "18:00"},
  --   "6": {"enabled": false}
  -- }
  -- Keys: "0"=Sunday ... "6"=Saturday
  -- enabled=false means the tasker does NOT work that day at all
  -- start/end are HH:MM format (24h), interpreted as Asia/Kathmandu time
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.tasker_weekly_schedule IS 'Per-day weekly schedule for each tasker. Keys 0-6 (Sun-Sat), each with enabled boolean and start/end time strings.';

ALTER TABLE public.tasker_weekly_schedule ENABLE ROW LEVEL SECURITY;

-- Taskers can view their own schedule
DROP POLICY IF EXISTS "Taskers can view own weekly schedule" ON public.tasker_weekly_schedule;
CREATE POLICY "Taskers can view own weekly schedule" ON public.tasker_weekly_schedule
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.taskers t
      WHERE t.id = tasker_weekly_schedule.tasker_id
        AND t.user_id = auth.uid()
    )
  );

-- Taskers can upsert their own schedule
DROP POLICY IF EXISTS "Taskers can manage own weekly schedule" ON public.tasker_weekly_schedule;
CREATE POLICY "Taskers can manage own weekly schedule" ON public.tasker_weekly_schedule
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.taskers t
      WHERE t.id = tasker_weekly_schedule.tasker_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Taskers can update own weekly schedule" ON public.tasker_weekly_schedule;
CREATE POLICY "Taskers can update own weekly schedule" ON public.tasker_weekly_schedule
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.taskers t
      WHERE t.id = tasker_weekly_schedule.tasker_id
        AND t.user_id = auth.uid()
    )
  );

-- Public can read schedules (needed for slot availability display)
DROP POLICY IF EXISTS "Anyone can view weekly schedules" ON public.tasker_weekly_schedule;
CREATE POLICY "Anyone can view weekly schedules" ON public.tasker_weekly_schedule
  FOR SELECT USING (true);

-- Admins can read all
DROP POLICY IF EXISTS "Admins can view all weekly schedules" ON public.tasker_weekly_schedule;
CREATE POLICY "Admins can view all weekly schedules" ON public.tasker_weekly_schedule
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 3. CREATE tasker_blocked_days TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tasker_blocked_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tasker_id, blocked_date)
);

COMMENT ON TABLE public.tasker_blocked_days IS 'Days a tasker has blocked (emergency leave, sick, personal). All slots on a blocked day are unavailable regardless of schedule.';

ALTER TABLE public.tasker_blocked_days ENABLE ROW LEVEL SECURITY;

-- Taskers can view their own blocked days
DROP POLICY IF EXISTS "Taskers can view own blocked days" ON public.tasker_blocked_days;
CREATE POLICY "Taskers can view own blocked days" ON public.tasker_blocked_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.taskers t
      WHERE t.id = tasker_blocked_days.tasker_id
        AND t.user_id = auth.uid()
    )
  );

-- Taskers can insert blocked days (only future or today)
DROP POLICY IF EXISTS "Taskers can block their own days" ON public.tasker_blocked_days;
CREATE POLICY "Taskers can block their own days" ON public.tasker_blocked_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.taskers t
      WHERE t.id = tasker_blocked_days.tasker_id
        AND t.user_id = auth.uid()
    )
    AND blocked_date >= CURRENT_DATE  -- Cannot block past dates
  );

-- Taskers can delete their own blocked days (to unblock)
DROP POLICY IF EXISTS "Taskers can unblock their own days" ON public.tasker_blocked_days;
CREATE POLICY "Taskers can unblock their own days" ON public.tasker_blocked_days
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.taskers t
      WHERE t.id = tasker_blocked_days.tasker_id
        AND t.user_id = auth.uid()
    )
  );

-- Public can see blocked days (needed for slot availability display)
DROP POLICY IF EXISTS "Anyone can view blocked days" ON public.tasker_blocked_days;
CREATE POLICY "Anyone can view blocked days" ON public.tasker_blocked_days
  FOR SELECT USING (true);

-- ============================================================================
-- 4. FUNCTION: is_day_blocked() — helper to check if a date is blocked
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_day_blocked(
  p_tasker_id UUID,
  p_date DATE
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasker_blocked_days
    WHERE tasker_id = p_tasker_id AND blocked_date = p_date
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. FUNCTION: get_available_slots() — returns available 1-hour slots
--    Filters by: schedule boundaries + not blocked + not already booked
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_tasker_id UUID,
  p_date DATE
)
RETURNS TABLE (
  slot_time TEXT  -- HH:MM format, 24h (e.g. "09:00", "10:00")
) AS $$
DECLARE
  v_schedule JSONB;
  v_day_key TEXT;
  v_day_config JSONB;
  v_start_hour INTEGER;
  v_end_hour INTEGER;
  v_h INTEGER;
  v_slot_text TEXT;
  v_booked_time TIME;
  v_booked_hours INTEGER;
  v_is_blocked BOOLEAN;
BEGIN
  -- 1. Check if day is blocked
  SELECT public.is_day_blocked(p_tasker_id, p_date) INTO v_is_blocked;
  IF v_is_blocked THEN
    RETURN;  -- Empty result set — no slots available on blocked day
  END IF;

  -- 2. Get schedule for this day_of_week (0=Sun, 6=Sat in Nepal time)
  v_day_key := to_char(p_date, 'D')::INTEGER;
  -- PostgreSQL's EXTRACT(DOW) returns 0=Sun, matches our keys

  SELECT tws.schedule INTO v_schedule
  FROM public.tasker_weekly_schedule tws
  WHERE tws.tasker_id = p_tasker_id;

  -- No schedule set → no slots (tasker hasn't configured weekly schedule)
  IF v_schedule IS NULL OR v_schedule = '{}'::jsonb THEN
    RETURN;
  END IF;

  v_day_config := v_schedule -> v_day_key;

  -- Day not enabled → no slots
  IF v_day_config IS NULL OR (v_day_config ->> 'enabled')::boolean IS FALSE THEN
    RETURN;
  END IF;

  -- 3. Parse start/end times
  v_start_hour := (SPLIT_PART(v_day_config ->> 'start', ':', 1))::INTEGER;
  v_end_hour  := (SPLIT_PART(v_day_config ->> 'end', ':', 1))::INTEGER;

  -- Generate 1-hour slots from start_hour to end_hour (end exclusive)
  -- e.g. start=9, end=18 → 09:00, 10:00, ..., 17:00
  FOR v_h IN v_start_hour .. (v_end_hour - 1) LOOP
    v_slot_text := LPAD(v_h::TEXT, 2, '0') || ':00';

    -- 4. Check if this slot is NOT already booked
    -- A slot is booked if there's an active booking whose time range covers it
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.tasker_id = p_tasker_id
        AND b.booking_date = p_date
        AND b.is_draft IS NOT TRUE
        AND b.status IN (
          'pending_acceptance', 'pending', 'confirmed', 'accepted',
          'on-the-way', 'arrived', 'in-progress'
        )
        -- The booking's time range overlaps this slot
        AND b.booking_time <= (v_slot_text || ':00')::TIME
        AND (b.booking_time + (b.hours || ' hours')::INTERVAL) > (v_slot_text || ':00')::TIME
    ) THEN
      slot_time := v_slot_text;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_available_slots(UUID, DATE) IS
  'Returns available 1-hour time slots (HH:MM) for a tasker on a given date. Filters by weekly schedule boundaries, blocked days, and existing bookings.';

-- ============================================================================
-- 6. FUNCTION: auto_toggle_tasker_online()
--    Cron job: runs every 1-2 minutes. Sets is_online based on schedule + blocked_days.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_toggle_tasker_online()
RETURNS TABLE (
  tasker_id UUID,
  was_online BOOLEAN,
  is_now_online BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_now TIMESTAMPTZ;
  v_nepal_time TIME;
  v_nepal_date DATE;
  v_day_key TEXT;
  v_day_config JSONB;
  v_start_time TIME;
  v_end_time TIME;
  v_schedule JSONB;
  v_blocked BOOLEAN;
  v_rec RECORD;
  v_changes INTEGER := 0;
BEGIN
  v_now := now();
  v_nepal_time := (v_now AT TIME ZONE 'Asia/Kathmandu')::TIME;
  v_nepal_date := (v_now AT TIME ZONE 'Asia/Kathmandu')::DATE;
  -- EXTRACT(DOW FROM date) returns 0=Sunday, 6=Saturday — matches our keys
  v_day_key := EXTRACT(DOW FROM v_nepal_date)::TEXT;

  FOR v_rec IN
    SELECT t.id, t.is_online, t.status
    FROM public.taskers t
    WHERE t.status = 'active'  -- Only auto-toggle active taskers
  LOOP
    -- Default: set to offline unless all conditions met
    v_schedule := NULL;
    v_blocked := false;

    -- Check if tasker has a schedule
    SELECT tws.schedule INTO v_schedule
    FROM public.tasker_weekly_schedule tws
    WHERE tws.tasker_id = v_rec.id;

    -- Check if today is blocked
    SELECT public.is_day_blocked(v_rec.id, v_nepal_date) INTO v_blocked;

    -- Determine desired online state
    IF v_schedule IS NOT NULL AND v_schedule != '{}'::jsonb AND NOT v_blocked THEN
      v_day_config := v_schedule -> v_day_key;

      IF v_day_config IS NOT NULL AND (v_day_config ->> 'enabled')::boolean IS TRUE THEN
        v_start_time := (v_day_config ->> 'start')::TIME;
        v_end_time  := (v_day_config ->> 'end')::TIME;

        -- Within scheduled working hours (start inclusive, end exclusive)
        IF v_nepal_time >= v_start_time AND v_nepal_time < v_end_time THEN
          -- Should be online
          IF v_rec.is_online = false THEN
            UPDATE public.taskers SET is_online = true WHERE id = v_rec.id;
            tasker_id := v_rec.id;
            was_online := false;
            is_now_online := true;
            reason := 'Entered scheduled hours (' || v_day_config ->> 'start' || '-' || v_day_config ->> 'end' || ')';
            RETURN NEXT;
            v_changes := v_changes + 1;
          END IF;
          CONTINUE;  -- Already online, skip
        END IF;
      END IF;
    END IF;

    -- Not in schedule window → should be offline
    IF v_rec.is_online = true THEN
      UPDATE public.taskers SET is_online = false WHERE id = v_rec.id;
      tasker_id := v_rec.id;
      was_online := true;
      is_now_online := false;

      IF v_blocked THEN
        reason := 'Today is blocked by tasker';
      ELSIF v_schedule IS NULL OR v_schedule = '{}'::jsonb THEN
        reason := 'No weekly schedule configured';
      ELSIF v_day_config IS NULL OR (v_day_config ->> 'enabled')::boolean IS FALSE THEN
        reason := 'Day not enabled in schedule';
      ELSE
        reason := 'Outside scheduled hours (' || v_day_config ->> 'start' || '-' || v_day_config ->> 'end' || ')';
      END IF;

      RETURN NEXT;
      v_changes := v_changes + 1;
    END IF;
  END LOOP;

  -- If no changes, return one row indicating that
  IF v_changes = 0 THEN
    tasker_id := NULL;
    was_online := NULL;
    is_now_online := NULL;
    reason := 'No changes needed — all taskers already in correct state';
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.auto_toggle_tasker_online() IS
  'Cron function: toggles is_online for each active tasker based on their weekly schedule and blocked_days. Runs every 1-2 minutes via pg_cron.';

-- ============================================================================
-- 7. FUNCTION: cleanup_past_blocked_days()
--    Cron job: runs daily at midnight. Removes blocked_days entries for past dates.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_past_blocked_days()
RETURNS TABLE (
  deleted_count INTEGER
) AS $$
BEGIN
  WITH deleted AS (
    DELETE FROM public.tasker_blocked_days
    WHERE blocked_date < (now() AT TIME ZONE 'Asia/Kathmandu')::DATE
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_past_blocked_days() IS
  'Daily cron: removes blocked_days entries for dates that have passed.';

-- ============================================================================
-- 8. TRIGGER: validate_booking_schedule()
--    Ensures a booking falls within the tasker's schedule and day is not blocked.
--    Runs BEFORE the conflict check trigger from migration 046.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_booking_schedule()
RETURNS TRIGGER AS $$
DECLARE
  v_schedule JSONB;
  v_day_key TEXT;
  v_day_config JSONB;
  v_start_time TIME;
  v_end_time TIME;
  v_booking_start TIME;
  v_booking_end TIME;
  v_blocked BOOLEAN;
BEGIN
  -- Skip validation for drafts
  IF NEW.is_draft IS TRUE THEN
    RETURN NEW;
  END IF;

  -- 1. Check if day is blocked
  SELECT public.is_day_blocked(NEW.tasker_id, NEW.booking_date) INTO v_blocked;
  IF v_blocked THEN
    RAISE EXCEPTION 'This day is not available for bookings.'
      USING HINT = 'The tasker has blocked this day. Please choose a different date.';
  END IF;

  -- 2. Check schedule boundaries
  v_day_key := EXTRACT(DOW FROM NEW.booking_date)::TEXT;

  SELECT tws.schedule INTO v_schedule
  FROM public.tasker_weekly_schedule tws
  WHERE tws.tasker_id = NEW.tasker_id;

  -- If no schedule set, allow the booking (backward compatibility with legacy taskers)
  IF v_schedule IS NULL OR v_schedule = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  v_day_config := v_schedule -> v_day_key;

  -- If day config doesn't exist or is disabled, reject
  IF v_day_config IS NULL OR (v_day_config ->> 'enabled')::boolean IS FALSE THEN
    RAISE EXCEPTION 'The tasker does not work on this day.'
      USING HINT = 'Please choose a day when the tasker is available.';
  END IF;

  -- 3. Check that booking falls entirely within schedule
  v_start_time := (v_day_config ->> 'start')::TIME;
  v_end_time  := (v_day_config ->> 'end')::TIME;
  v_booking_start := NEW.booking_time;
  v_booking_end  := v_booking_start + (NEW.hours || ' hours')::INTERVAL;

  -- Booking start must be >= schedule start
  IF v_booking_start < v_start_time THEN
    RAISE EXCEPTION 'Booking cannot start before % on this day. The tasker works from % to %.',
      v_day_config ->> 'start', v_day_config ->> 'start', v_day_config ->> 'end'
      USING HINT = 'Choose a later time within the tasker''s working hours.';
  END IF;

  -- Booking end must be <= schedule end
  IF v_booking_end > v_end_time THEN
    RAISE EXCEPTION 'Booking cannot extend past % on this day. The tasker works from % to %.',
      v_day_config ->> 'end', v_day_config ->> 'start', v_day_config ->> 'end'
      USING HINT = 'Choose a shorter duration or an earlier start time.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- This trigger fires BEFORE the conflict check trigger (trigger_prevent_booking_conflict from 046)
-- Note: trigger execution order follows alphabetical order of trigger names by default in PostgreSQL.
-- We name it with 'a_' prefix to ensure it runs first.
DROP TRIGGER IF EXISTS trg_a_validate_booking_schedule ON public.bookings;
CREATE TRIGGER trg_a_validate_booking_schedule
  BEFORE INSERT OR UPDATE OF booking_date, booking_time, hours, tasker_id
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_schedule();

-- ============================================================================
-- 9. FUNCTION: get_tasker_schedule_summary()
--    Returns a tasker's schedule in a human-readable format for display.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tasker_schedule_summary(
  p_tasker_id UUID
)
RETURNS TABLE (
  day_index INTEGER,
  day_name TEXT,
  enabled BOOLEAN,
  start_time TEXT,
  end_time TEXT
) AS $$
DECLARE
  v_schedule JSONB;
  v_day INTEGER;
  v_config JSONB;
  v_day_names TEXT[] := ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
BEGIN
  SELECT tws.schedule INTO v_schedule
  FROM public.tasker_weekly_schedule tws
  WHERE tws.tasker_id = p_tasker_id;

  FOR v_day IN 0..6 LOOP
    day_index := v_day;
    day_name := v_day_names[v_day + 1];

    IF v_schedule IS NOT NULL AND v_schedule ? v_day::TEXT THEN
      v_config := v_schedule -> v_day::TEXT;
      enabled := (v_config ->> 'enabled')::boolean;
      start_time := v_config ->> 'start';
      end_time := v_config ->> 'end';
    ELSE
      enabled := false;
      start_time := NULL;
      end_time := NULL;
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_tasker_schedule_summary(UUID) IS
  'Returns a 7-row summary of a tasker''s weekly schedule with human-readable day names.';

-- ============================================================================
-- 10. BACKFILL: Convert existing availability_hours → tasker_weekly_schedule
--     One-time migration for existing taskers who already set availability.
--     Maps: morning→08-12, afternoon→12-17, evening→17-21
-- ============================================================================

DO $$
DECLARE
  v_rec RECORD;
  v_schedule JSONB;
  v_day_names TEXT[] := ARRAY['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  v_day_idx INTEGER;
  v_slots TEXT[];
  v_has_morning BOOLEAN;
  v_has_afternoon BOOLEAN;
  v_has_evening BOOLEAN;
  v_new_config JSONB;
  v_count INTEGER := 0;
BEGIN
  -- Find taskers with availability_hours but no weekly_schedule yet
  FOR v_rec IN
    SELECT t.id, t.availability_hours
    FROM public.taskers t
    LEFT JOIN public.tasker_weekly_schedule tws ON tws.tasker_id = t.id
    WHERE t.availability_hours IS NOT NULL
      AND t.availability_hours != '{}'::jsonb
      AND t.availability_hours::text != '{"mon":[],"tue":[],"wed":[],"thu":[],"fri":[],"sat":[],"sun":[]}'::text
      AND tws.id IS NULL  -- Don't overwrite already-migrated taskers
  LOOP
    v_schedule := '{}'::jsonb;

    FOR v_day_idx IN 0..6 LOOP
      v_slots := ARRAY(
        SELECT jsonb_array_elements_text(v_rec.availability_hours -> v_day_names[v_day_idx + 1])
      );

      v_has_morning := 'morning' = ANY(v_slots);
      v_has_afternoon := 'afternoon' = ANY(v_slots);
      v_has_evening := 'evening' = ANY(v_slots);

      IF v_has_morning OR v_has_afternoon OR v_has_evening THEN
        -- Merge contiguous slots into one range
        IF v_has_morning AND v_has_afternoon THEN
          -- Morning + Afternoon → 08:00-17:00
          IF v_has_evening THEN
            -- All three → 08:00-21:00
            v_new_config := jsonb_build_object('enabled', true, 'start', '08:00', 'end', '21:00');
          ELSE
            v_new_config := jsonb_build_object('enabled', true, 'start', '08:00', 'end', '17:00');
          END IF;
        ELSIF v_has_afternoon AND v_has_evening THEN
          -- Afternoon + Evening → 12:00-21:00
          v_new_config := jsonb_build_object('enabled', true, 'start', '12:00', 'end', '21:00');
        ELSIF v_has_morning THEN
          v_new_config := jsonb_build_object('enabled', true, 'start', '08:00', 'end', '12:00');
        ELSIF v_has_afternoon THEN
          v_new_config := jsonb_build_object('enabled', true, 'start', '12:00', 'end', '17:00');
        ELSIF v_has_evening THEN
          v_new_config := jsonb_build_object('enabled', true, 'start', '17:00', 'end', '21:00');
        END IF;

        v_schedule := v_schedule || jsonb_build_object(v_day_idx::TEXT, v_new_config);
      ELSE
        -- No slots → day disabled
        v_schedule := v_schedule || jsonb_build_object(v_day_idx::TEXT, jsonb_build_object('enabled', false));
      END IF;
    END LOOP;

    -- Insert the new schedule
    INSERT INTO public.tasker_weekly_schedule (tasker_id, schedule)
    VALUES (v_rec.id, v_schedule)
    ON CONFLICT (tasker_id) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '✅ Backfilled weekly schedules for % taskers', v_count;
END $$;

-- ============================================================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tasker_weekly_schedule_tasker ON public.tasker_weekly_schedule(tasker_id);
CREATE INDEX IF NOT EXISTS idx_tasker_blocked_days_tasker_date ON public.tasker_blocked_days(tasker_id, blocked_date);
-- Note: Cannot use partial index with CURRENT_DATE (STABLE function in index predicate).
-- Using a full index instead; the table is small and cleanup cron keeps it tidy.
CREATE INDEX IF NOT EXISTS idx_tasker_blocked_days_date ON public.tasker_blocked_days(blocked_date);

-- ============================================================================
-- 12. ADD updated_at AUTO-TRIGGER FOR tasker_weekly_schedule
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_weekly_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_weekly_schedule_timestamp ON public.tasker_weekly_schedule;
CREATE TRIGGER trg_update_weekly_schedule_timestamp
  BEFORE UPDATE ON public.tasker_weekly_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_weekly_schedule_timestamp();

-- ============================================================================
-- 13. GRANT PERMISSIONS
-- ============================================================================

-- Tables
GRANT SELECT ON public.tasker_weekly_schedule TO authenticated, anon;
GRANT INSERT, UPDATE ON public.tasker_weekly_schedule TO authenticated;
GRANT SELECT ON public.tasker_blocked_days TO authenticated, anon;
GRANT INSERT, DELETE ON public.tasker_blocked_days TO authenticated;

-- Functions
GRANT EXECUTE ON FUNCTION public.is_day_blocked(UUID, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_available_slots(UUID, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_tasker_schedule_summary(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.auto_toggle_tasker_online() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_past_blocked_days() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_booking_schedule() TO authenticated, service_role;

-- ============================================================================
-- 14. ENABLE REPLICATION FOR REALTIME (for is_online subscription)
-- ============================================================================

-- Add taskers to supabase_realtime publication if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'taskers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.taskers;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after applying migration):
--
-- 1. Check backfill:
--    SELECT COUNT(*) FROM tasker_weekly_schedule;
--
-- 2. Test get_available_slots:
--    SELECT * FROM get_available_slots('<tasker_id>', CURRENT_DATE);
--
-- 3. Test auto_toggle:
--    SELECT * FROM auto_toggle_tasker_online();
--
-- 4. Check is_online status:
--    SELECT id, user_id, is_online, status FROM taskers WHERE status = 'active';
--
-- 5. Test blocked day:
--    INSERT INTO tasker_blocked_days (tasker_id, blocked_date, reason)
--    VALUES ('<tasker_id>', CURRENT_DATE, 'Sick leave');
--    SELECT * FROM get_available_slots('<tasker_id>', CURRENT_DATE);  -- Should be empty
--    DELETE FROM tasker_blocked_days WHERE tasker_id = '<tasker_id>' AND blocked_date = CURRENT_DATE;
-- ============================================================================