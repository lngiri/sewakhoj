-- 025_abandoned_booking_tracker.sql

-- Add Draft Support to Bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_step_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMP WITH TIME ZONE;

-- Index for faster filtering of abandoned bookings
CREATE INDEX IF NOT EXISTS idx_bookings_is_draft ON bookings(is_draft) WHERE is_draft = true;
