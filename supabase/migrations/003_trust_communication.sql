-- Phase 1: Trust & Communication Engine

-- 1. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Customers can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Trigger to recalculate Tasker rating automatically
CREATE OR REPLACE FUNCTION update_tasker_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.taskers
    SET rating = (
        SELECT ROUND(AVG(rating)::numeric, 1)
        FROM public.reviews
        WHERE tasker_id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.tasker_id ELSE NEW.tasker_id END)
    )
    WHERE id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.tasker_id ELSE NEW.tasker_id END);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tasker_rating ON public.reviews;
CREATE TRIGGER trigger_update_tasker_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_tasker_rating();


-- 2. Messages Table for In-App Live Chat
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime broadcasts for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages of their bookings" ON public.messages
  FOR SELECT USING (
    auth.uid() IN (
        SELECT customer_id FROM public.bookings WHERE id = booking_id
        UNION
        SELECT user_id FROM public.taskers WHERE id = (SELECT tasker_id FROM public.bookings WHERE id = booking_id)
    )
  );

CREATE POLICY "Users can insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
