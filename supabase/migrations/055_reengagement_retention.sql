-- Migration 055: Re-engagement & Retention (Phase 8)
-- Covers: 8.1 Re-engagement Automation, 8.2 Loyalty Program, 8.3 Referral Expiry, 8.4 Performance Reviews
-- Created for: SewaKhoj Marketplace Intelligence

-- ============================================================================
-- 8.1: Re-engagement Automation — last_active_at on users
-- ============================================================================

-- Add last_active_at to users table (taskers already has it from migration 036)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Function to update last_active_at on any user activity
CREATE OR REPLACE FUNCTION public.touch_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users SET last_active_at = NOW() WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: update last_active_at when a user creates a booking
DROP TRIGGER IF EXISTS trg_booking_touch_user ON public.bookings;
CREATE TRIGGER trg_booking_touch_user
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_last_active();

-- Trigger: update last_active_at when a user sends a chat message
DROP TRIGGER IF EXISTS trg_message_touch_user ON public.messages;
CREATE TRIGGER trg_message_touch_user
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_last_active();

-- ============================================================================
-- 8.1: Find dormant users for re-engagement
-- ============================================================================

-- Returns users who haven't been active for N days
CREATE OR REPLACE FUNCTION public.find_dormant_users(
  p_inactive_days INTEGER DEFAULT 7,
  p_role_filter TEXT DEFAULT NULL -- 'customer' or 'tasker' or NULL for both
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  last_active_at TIMESTAMPTZ,
  days_inactive INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.full_name,
    u.email,
    u.phone,
    u.role,
    u.last_active_at,
    EXTRACT(DAY FROM (NOW() - u.last_active_at))::INTEGER AS days_inactive
  FROM public.users u
  WHERE u.last_active_at < NOW() - (p_inactive_days || ' days')::INTERVAL
    AND u.account_status = 'active'
    AND (p_role_filter IS NULL OR u.role = p_role_filter)
  ORDER BY u.last_active_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8.2: Loyalty Program
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_points (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  lifetime_points INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own loyalty points" ON public.loyalty_points
  FOR SELECT USING (auth.uid() = user_id);

-- Function to award loyalty points on booking completion
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_amount NUMERIC;
  v_points INTEGER;
  v_lifetime INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Only award on completion
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    v_customer_id := NEW.customer_id;
    v_amount := COALESCE(NEW.total_amount, 0);

    -- 10 points per NPR 1000 spent (minimum 10 points)
    v_points := GREATEST(10, FLOOR(v_amount / 100)::INTEGER);

    -- Upsert loyalty points
    INSERT INTO public.loyalty_points (user_id, points, lifetime_points, tier)
    VALUES (v_customer_id, v_points, v_points, 'bronze')
    ON CONFLICT (user_id) DO UPDATE SET
      points = loyalty_points.points + v_points,
      lifetime_points = loyalty_points.lifetime_points + v_points,
      updated_at = NOW();

    -- Recalculate tier
    SELECT lifetime_points INTO v_lifetime
    FROM public.loyalty_points WHERE user_id = v_customer_id;

    v_new_tier := CASE
      WHEN v_lifetime >= 5000 THEN 'platinum'
      WHEN v_lifetime >= 2000 THEN 'gold'
      WHEN v_lifetime >= 500 THEN 'silver'
      ELSE 'bronze'
    END;

    UPDATE public.loyalty_points
    SET tier = v_new_tier, updated_at = NOW()
    WHERE user_id = v_customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: award loyalty points on booking completion
DROP TRIGGER IF EXISTS trg_award_loyalty ON public.bookings;
CREATE TRIGGER trg_award_loyalty
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_points();

-- ============================================================================
-- 8.3: Referral Rewards Expiry
-- ============================================================================

-- Add expires_at to wallet_transactions
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Set 90-day expiry on existing referral credits that don't have one
UPDATE public.wallet_transactions
SET expires_at = created_at + INTERVAL '90 days'
WHERE source = 'referral' AND expires_at IS NULL;

-- Function to expire unused referral credits
CREATE OR REPLACE FUNCTION public.expire_referral_credits()
RETURNS TABLE(expired_count INTEGER, total_amount INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_total INTEGER;
BEGIN
  -- Expire credits past their expiry date
  WITH expired AS (
    UPDATE public.wallet_transactions wt
    SET description = COALESCE(description, '') || ' [EXPIRED]'
    FROM public.wallets w
    WHERE wt.wallet_id = w.id
      AND wt.type = 'credit'
      AND wt.source = 'referral'
      AND wt.expires_at IS NOT NULL
      AND wt.expires_at < NOW()
      AND wt.description NOT LIKE '%[EXPIRED]%'
    RETURNING wt.amount
  )
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_count, v_total FROM expired;

  -- Deduct expired amounts from wallet balances
  UPDATE public.wallets w
  SET balance = GREATEST(0, balance - expired.total),
      updated_at = NOW()
  FROM (
    SELECT wt.wallet_id, SUM(wt.amount) AS total
    FROM public.wallet_transactions wt
    WHERE wt.type = 'credit'
      AND wt.source = 'referral'
      AND wt.expires_at IS NOT NULL
      AND wt.expires_at < NOW()
      AND wt.description LIKE '%[EXPIRED]%'
    GROUP BY wt.wallet_id
  ) expired
  WHERE w.id = expired.wallet_id;

  expired_count := v_count;
  total_amount := v_total;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find credits expiring soon (for notification)
CREATE OR REPLACE FUNCTION public.find_expiring_credits(
  p_days_before INTEGER DEFAULT 7
)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  credit_amount INTEGER,
  expires_at TIMESTAMPTZ,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.user_id,
    u.full_name,
    u.email,
    wt.amount,
    wt.expires_at,
    EXTRACT(DAY FROM (wt.expires_at - NOW()))::INTEGER AS days_remaining
  FROM public.wallet_transactions wt
  JOIN public.wallets w ON wt.wallet_id = w.id
  JOIN public.users u ON w.user_id = u.id
  WHERE wt.type = 'credit'
    AND wt.source = 'referral'
    AND wt.expires_at IS NOT NULL
    AND wt.expires_at > NOW()
    AND wt.expires_at < NOW() + (p_days_before || ' days')::INTERVAL
    AND wt.description NOT LIKE '%[EXPIRED]%'
  ORDER BY wt.expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8.4: Tasker Performance Reviews
-- ============================================================================

-- Function to generate monthly performance summary for a tasker
CREATE OR REPLACE FUNCTION public.get_tasker_performance_summary(
  p_tasker_id UUID,
  p_months_back INTEGER DEFAULT 1
)
RETURNS TABLE(
  jobs_completed BIGINT,
  jobs_cancelled BIGINT,
  jobs_disputed BIGINT,
  avg_rating NUMERIC,
  total_earnings NUMERIC,
  response_time_avg_seconds NUMERIC,
  category_avg_rating NUMERIC,
  category_rank TEXT
) AS $$
DECLARE
  v_start_date DATE := DATE_TRUNC('month', NOW()) - (p_months_back || ' months')::INTERVAL;
  v_end_date DATE := DATE_TRUNC('month', NOW()) - ((p_months_back - 1) || ' months')::INTERVAL;
  v_tasker_skills UUID[];
BEGIN
  -- Get tasker's skills
  SELECT ARRAY_AGG(skill_id) INTO v_tasker_skills
  FROM public.tasker_skills WHERE tasker_id = p_tasker_id;

  RETURN QUERY
  WITH tasker_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE b.status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
      COUNT(*) FILTER (WHERE b.is_disputed = true) AS disputed,
      COALESCE(AVG(r.rating) FILTER (WHERE r.moderation_status = 'approved'), 0) AS rating,
      COALESCE(SUM(b.total_amount) FILTER (WHERE b.status = 'completed'), 0) AS earnings
    FROM public.bookings b
    LEFT JOIN public.reviews r ON r.booking_id = b.id
    WHERE b.tasker_id = p_tasker_id
      AND b.created_at >= v_start_date
      AND b.created_at < v_end_date
  ),
  category_stats AS (
    SELECT COALESCE(AVG(r2.rating) FILTER (WHERE r2.moderation_status = 'approved'), 0) AS cat_rating
    FROM public.bookings b2
    JOIN public.reviews r2 ON r2.booking_id = b2.id
    WHERE b2.tasker_id IN (
      SELECT ts.tasker_id FROM public.tasker_skills ts
      WHERE ts.skill_id = ANY(v_tasker_skills)
    )
      AND b2.created_at >= v_start_date
      AND b2.created_at < v_end_date
  ),
  response_stats AS (
    SELECT COALESCE(AVG(
      EXTRACT(EPOCH FROM (m.created_at - b3.created_at))
    ), 0) AS resp_time
    FROM public.bookings b3
    JOIN LATERAL (
      SELECT m.created_at FROM public.messages m
      WHERE m.booking_id = b3.id AND m.sender_id = p_tasker_id
      ORDER BY m.created_at ASC LIMIT 1
    ) m ON true
    WHERE b3.tasker_id = p_tasker_id
      AND b3.created_at >= v_start_date
      AND b3.created_at < v_end_date
  )
  SELECT
    ts.completed,
    ts.cancelled,
    ts.disputed,
    ROUND(ts.rating, 2),
    ts.earnings,
    ROUND(rs.resp_time, 1),
    ROUND(cs.cat_rating, 2),
    CASE
      WHEN ts.rating >= cs.cat_rating + 0.5 THEN 'Above Average'
      WHEN ts.rating <= cs.cat_rating - 0.5 THEN 'Below Average'
      ELSE 'Average'
    END
  FROM tasker_stats ts
  CROSS JOIN category_stats cs
  CROSS JOIN response_stats rs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find taskers with declining metrics (for admin review)
CREATE OR REPLACE FUNCTION public.find_declining_taskers(
  p_rating_drop_threshold NUMERIC DEFAULT 0.5
)
RETURNS TABLE(
  tasker_id UUID,
  tasker_name TEXT,
  current_rating NUMERIC,
  previous_rating NUMERIC,
  rating_drop NUMERIC,
  completion_rate_current NUMERIC,
  completion_rate_previous NUMERIC
) AS $$
DECLARE
  v_this_month DATE := DATE_TRUNC('month', NOW());
  v_last_month DATE := DATE_TRUNC('month', NOW()) - INTERVAL '1 month';
BEGIN
  RETURN QUERY
  WITH current_month AS (
    SELECT
      b.tasker_id,
      COALESCE(AVG(r.rating) FILTER (WHERE r.moderation_status = 'approved'), 0) AS avg_rating,
      CASE WHEN COUNT(*) > 0
        THEN COUNT(*) FILTER (WHERE b.status = 'completed')::NUMERIC / COUNT(*)::NUMERIC
        ELSE 0
      END AS completion_rate
    FROM public.bookings b
    LEFT JOIN public.reviews r ON r.booking_id = b.id
    WHERE b.created_at >= v_this_month
    GROUP BY b.tasker_id
  ),
  previous_month AS (
    SELECT
      b.tasker_id,
      COALESCE(AVG(r.rating) FILTER (WHERE r.moderation_status = 'approved'), 0) AS avg_rating,
      CASE WHEN COUNT(*) > 0
        THEN COUNT(*) FILTER (WHERE b.status = 'completed')::NUMERIC / COUNT(*)::NUMERIC
        ELSE 0
      END AS completion_rate
    FROM public.bookings b
    LEFT JOIN public.reviews r ON r.booking_id = b.id
    WHERE b.created_at >= v_last_month AND b.created_at < v_this_month
    GROUP BY b.tasker_id
  )
  SELECT
    cm.tasker_id,
    u.full_name,
    ROUND(cm.avg_rating, 2),
    ROUND(pm.avg_rating, 2),
    ROUND(pm.avg_rating - cm.avg_rating, 2),
    ROUND(cm.completion_rate * 100, 1),
    ROUND(pm.completion_rate * 100, 1)
  FROM current_month cm
  JOIN previous_month pm ON cm.tasker_id = pm.tasker_id
  JOIN public.taskers t ON cm.tasker_id = t.id
  JOIN public.users u ON t.user_id = u.id
  WHERE pm.avg_rating - cm.avg_rating >= p_rating_drop_threshold
     OR pm.completion_rate - cm.completion_rate >= 0.2
  ORDER BY (pm.avg_rating - cm.avg_rating) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_last_active ON public.users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_expires ON public.wallet_transactions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loyalty_points_tier ON public.loyalty_points(tier);
