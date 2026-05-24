-- Migration 072: Fix race condition in booking conflict trigger
-- Ignore drafts in the booking conflict check

BEGIN;

CREATE OR REPLACE FUNCTION prevent_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- SKIP validation for drafts
  IF NEW.is_draft IS TRUE THEN
    RETURN NEW;
  END IF;

  IF check_booking_conflict(NEW.tasker_id, NEW.booking_date, NEW.booking_time, NEW.hours, NEW.id) THEN
    RAISE EXCEPTION 'This time slot is no longer available. Please choose a different time.'
      USING HINT = 'Another booking already exists for this tasker at the selected time.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
