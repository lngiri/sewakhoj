-- ============================================================================
-- Migration 054: Reputation & Trust Hardening
-- Phase 7: Review Moderation, Tasker Responses, Rating Reconciliation,
--          Review Prompt Automation
-- ============================================================================

-- ============================================================================
-- 7.1: REVIEW MODERATION
-- Add moderation columns to reviews table
-- ============================================================================

-- Add moderation columns
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved'
  CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

-- Index for moderation queue
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status
  ON public.reviews(moderation_status)
  WHERE moderation_status = 'pending';

-- ============================================================================
-- 7.2: TASKER REVIEW RESPONSE
-- Allow taskers to respond to reviews
-- ============================================================================

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS tasker_response TEXT,
ADD COLUMN IF NOT EXISTS tasker_response_at TIMESTAMPTZ;

-- ============================================================================
-- 7.4: RATING REDUNDANCY FIX
-- Update the rating trigger to only count approved reviews
-- Add reconciliation function to detect drift
-- ============================================================================

-- Drop the old trigger first (from migration 003b)
DROP TRIGGER IF EXISTS trigger_update_tasker_rating ON public.reviews;

-- Updated trigger function: only counts approved reviews
CREATE OR REPLACE FUNCTION update_tasker_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_tasker_id UUID;
BEGIN
  target_tasker_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.tasker_id ELSE NEW.tasker_id END;

  UPDATE public.taskers
  SET
    average_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.reviews
      WHERE tasker_id = target_tasker_id
        AND moderation_status = 'approved'
    ), 0),
    total_ratings = COALESCE((
      SELECT COUNT(*)
      FROM public.reviews
      WHERE tasker_id = target_tasker_id
        AND moderation_status = 'approved'
    ), 0)
  WHERE id = target_tasker_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger
CREATE TRIGGER trigger_update_tasker_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_tasker_rating();

-- Reconciliation function: detect and report rating drift
CREATE OR REPLACE FUNCTION reconcile_tasker_ratings()
RETURNS TABLE(
  tasker_id UUID,
  stored_rating DECIMAL(3,2),
  computed_rating DECIMAL,
  drift DECIMAL,
  review_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS tasker_id,
    COALESCE(t.average_rating, 0) AS stored_rating,
    COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) AS computed_rating,
    ABS(COALESCE(t.average_rating, 0) - COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)) AS drift,
    COUNT(r.id) AS review_count
  FROM public.taskers t
  LEFT JOIN public.reviews r
    ON r.tasker_id = t.id
    AND r.moderation_status = 'approved'
  GROUP BY t.id, t.average_rating
  HAVING ABS(COALESCE(t.average_rating, 0) - COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)) > 0.1
     AND COUNT(r.id) > 0;
END;
$$ LANGUAGE plpgsql;

-- Auto-fix function: corrects drifted ratings
CREATE OR REPLACE FUNCTION auto_fix_tasker_ratings()
RETURNS INTEGER AS $$
DECLARE
  fixed_count INTEGER := 0;
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM reconcile_tasker_ratings() LOOP
    UPDATE public.taskers
    SET
      average_rating = rec.computed_rating,
      total_ratings = rec.review_count
    WHERE id = rec.tasker_id;
    fixed_count := fixed_count + 1;
  END LOOP;
  RETURN fixed_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7.5: REVIEW PROMPT AUTOMATION
-- Add review_prompt_sent_at to bookings, create prompt function
-- ============================================================================

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS review_prompt_sent_at TIMESTAMPTZ;

-- Function to find completed bookings without reviews and send prompts
-- (Called by cron; actual SMS/email sending happens in application layer)
CREATE OR REPLACE FUNCTION find_bookings_needing_review_prompt()
RETURNS TABLE(
  booking_id UUID,
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  tasker_id UUID,
  tasker_name TEXT,
  service_name TEXT,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS booking_id,
    b.customer_id,
    cu.full_name AS customer_name,
    cu.phone AS customer_phone,
    b.tasker_id,
    tu.full_name AS tasker_name,
    s.name_en AS service_name,
    b.updated_at AS completed_at
  FROM public.bookings b
  JOIN public.users cu ON cu.id = b.customer_id
  JOIN public.taskers t ON t.id = b.tasker_id
  JOIN public.users tu ON tu.id = t.user_id
  LEFT JOIN public.services s ON s.id::text = b.service
  LEFT JOIN public.reviews r ON r.booking_id = b.id
  WHERE b.status = 'completed'
    AND b.updated_at < NOW() - INTERVAL '24 hours'
    AND b.updated_at > NOW() - INTERVAL '72 hours'
    AND r.id IS NULL                    -- No review yet
    AND b.review_prompt_sent_at IS NULL -- Prompt not yet sent
  ORDER BY b.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Mark review prompt as sent
CREATE OR REPLACE FUNCTION mark_review_prompt_sent(p_booking_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.bookings
  SET review_prompt_sent_at = NOW()
  WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS: Allow taskers to update their response on reviews
-- ============================================================================

-- Drop existing update policy if it exists (from 003b which only had SELECT/INSERT)
DROP POLICY IF EXISTS "Taskers can respond to their reviews" ON public.reviews;

CREATE POLICY "Taskers can respond to their reviews" ON public.reviews
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.taskers WHERE id = reviews.tasker_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.taskers WHERE id = reviews.tasker_id
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION reconcile_tasker_ratings() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_fix_tasker_ratings() TO authenticated;
GRANT EXECUTE ON FUNCTION find_bookings_needing_review_prompt() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_review_prompt_sent(UUID) TO authenticated;
