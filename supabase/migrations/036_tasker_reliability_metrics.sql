-- Migration 036: Tasker Reliability Metrics & Trust Automation
-- Created for: SewaKhoj Marketplace Intelligence

-- 1. Add Performance Tracking Columns to Taskers
ALTER TABLE public.taskers
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS docs_expiry_date DATE,
ADD COLUMN IF NOT EXISTS is_elite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_time_avg INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Ensure trust_score column exists (Migration 017 might have added it, but let's be safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='taskers' AND column_name='trust_score') THEN
        ALTER TABLE public.taskers ADD COLUMN trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100);
    END IF;
END $$;

-- 3. Add last_lat/last_long to market_tasks (for Demand Heatmap)
-- Assuming the table name is 'market_tasks' or 'job_posts' based on seed.mjs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='market_tasks') THEN
        ALTER TABLE public.market_tasks ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION;
        ALTER TABLE public.market_tasks ADD COLUMN IF NOT EXISTS last_long DOUBLE PRECISION;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='job_posts') THEN
        ALTER TABLE public.job_posts ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION;
        ALTER TABLE public.job_posts ADD COLUMN IF NOT EXISTS last_long DOUBLE PRECISION;
    END IF;
END $$;

-- 4. Enable Realtime for Taskers table updates (for Live Map Status)
-- This might already be enabled, but running it again is safe.
ALTER PUBLICATION supabase_realtime ADD TABLE public.taskers;
