-- Phase 2: Advanced Booking schema additions

-- 1. Add transportation mode and rejections to taskers
ALTER TABLE public.taskers 
ADD COLUMN IF NOT EXISTS transportation_mode TEXT DEFAULT 'motorcycle' CHECK (transportation_mode IN ('walking', 'bicycle', 'motorcycle', 'car', 'public_transit')),
ADD COLUMN IF NOT EXISTS total_rejections INTEGER DEFAULT 0;

-- 2. Add task photo support to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS task_photo_url TEXT;

-- 3. Update bookings status constraint (this requires dropping the old constraint and adding a new one in postgres)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'accepted', 'on-the-way', 'arrived', 'in-progress', 'completed', 'cancelled'));

-- 4. Create task_photos storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task_photos', 'task_photos', true)
ON CONFLICT DO NOTHING;

-- Storage policies for task photos
CREATE POLICY "Anyone can upload task photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'task_photos');

CREATE POLICY "Anyone can view task photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'task_photos');
