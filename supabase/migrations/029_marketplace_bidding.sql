-- Marketplace Tasks & Bidding System
-- Run this in Supabase SQL Editor

-- 1. Market Tasks Table (Jobs posted by customers)
CREATE TABLE IF NOT EXISTS public.market_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id TEXT NOT NULL, -- Links to service IDs (plumbing, etc)
  budget_type TEXT DEFAULT 'fixed' CHECK (budget_type IN ('fixed', 'range', 'negotiable')),
  budget_amount INTEGER,
  location_name TEXT,
  location_coords JSONB, -- {lat: 0, lng: 0}
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'completed', 'cancelled')),
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Task Bids Table (Offers from Taskers)
CREATE TABLE IF NOT EXISTS public.task_bids (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.market_tasks(id) ON DELETE CASCADE NOT NULL,
  tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE NOT NULL,
  bid_amount INTEGER NOT NULL,
  message TEXT,
  estimated_duration TEXT, -- e.g., "2 hours", "1 day"
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.market_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_bids ENABLE ROW LEVEL SECURITY;

-- 4. Market Tasks Policies
CREATE POLICY "Anyone can view open tasks" ON public.market_tasks
  FOR SELECT USING (status = 'open');

CREATE POLICY "Customers can manage their own tasks" ON public.market_tasks
  FOR ALL USING (auth.uid() = customer_id);

-- 5. Task Bids Policies
CREATE POLICY "Taskers can view bids for tasks they bid on" ON public.task_bids
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.taskers WHERE id = tasker_id)
  );

CREATE POLICY "Customers can view bids for their tasks" ON public.task_bids
  FOR SELECT USING (
    auth.uid() IN (SELECT customer_id FROM public.market_tasks WHERE id = task_id)
  );

CREATE POLICY "Taskers can place bids" ON public.task_bids
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.taskers WHERE status = 'active')
  );

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_tasks_status ON public.market_tasks(status);
CREATE INDEX IF NOT EXISTS idx_market_tasks_category ON public.market_tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_task_bids_task ON public.task_bids(task_id);
CREATE INDEX IF NOT EXISTS idx_task_bids_tasker ON public.task_bids(tasker_id);
