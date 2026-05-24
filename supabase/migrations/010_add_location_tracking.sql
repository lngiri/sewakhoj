-- Add location tracking columns to taskers
ALTER TABLE public.taskers
ADD COLUMN IF NOT EXISTS last_lat DECIMAL(9,6),
ADD COLUMN IF NOT EXISTS last_long DECIMAL(9,6),
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable realtime for taskers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.taskers;
