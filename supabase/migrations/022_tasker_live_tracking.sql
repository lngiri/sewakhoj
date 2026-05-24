-- Migration: Live Tasker Tracking for Phase 2
CREATE TABLE IF NOT EXISTS public.tasker_locations (
    tasker_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasker_locations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view active tasker locations"
ON public.tasker_locations FOR SELECT
USING (true);

CREATE POLICY "Taskers can update their own live location"
ON public.tasker_locations FOR ALL
USING (auth.uid() = tasker_id)
WITH CHECK (auth.uid() = tasker_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasker_locations;
