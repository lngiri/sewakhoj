ALTER TABLE public.taskers ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0;

-- Create function to increment profile views
CREATE OR REPLACE FUNCTION increment_profile_views(tasker_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.taskers
  SET profile_views = profile_views + 1
  WHERE id = tasker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
