-- Add dispute/flagging columns to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS dispute_created_at TIMESTAMP WITH TIME ZONE;

-- Allow users to update their own bookings to flag a dispute
-- (The existing policy already allows users to update their own bookings)
