-- Push Notifications System
-- Table for storing web push subscriptions

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Add trigger for booking accepted notification
CREATE OR REPLACE FUNCTION notify_booking_accepted()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    supabase_functions.http_request(
      'https://sewakhoj.com/api/push/send',
      'POST',
      '{"Content-Type":"application/json"}',
      json_build_object(
        'user_id', NEW.customer_id,
        'title', 'Booking Accepted',
        'body', 'Your tasker is on the way!',
        'data', json_build_object('booking_id', NEW.id, 'type', 'booking_accepted')
      )::jsonb,
      '1000'
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_accepted ON public.bookings;
CREATE TRIGGER trigger_booking_accepted
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'accepted')
EXECUTE FUNCTION notify_booking_accepted();
