-- Create job_posts table
CREATE TABLE IF NOT EXISTS public.job_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  city TEXT NOT NULL,
  description TEXT NOT NULL,
  budget INTEGER,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'completed', 'cancelled')),
  accepted_by_tasker_id UUID REFERENCES public.taskers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;

-- Policies for job_posts

-- Anyone can view open jobs (so taskers can see them)
DROP POLICY IF EXISTS "Anyone can view open job posts" ON public.job_posts;
CREATE POLICY "Anyone can view open job posts" ON public.job_posts
  FOR SELECT USING (status = 'open' OR auth.uid() = customer_id OR auth.uid() IN (SELECT user_id FROM public.taskers WHERE id = accepted_by_tasker_id));

-- Customers can create their own job posts
DROP POLICY IF EXISTS "Customers can create job posts" ON public.job_posts;
CREATE POLICY "Customers can create job posts" ON public.job_posts
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own job posts (e.g. to cancel)
DROP POLICY IF EXISTS "Customers can update their own job posts" ON public.job_posts;
CREATE POLICY "Customers can update their own job posts" ON public.job_posts
  FOR UPDATE USING (auth.uid() = customer_id);

-- Taskers can update open jobs to accept them
DROP POLICY IF EXISTS "Taskers can accept open jobs" ON public.job_posts;
CREATE POLICY "Taskers can accept open jobs" ON public.job_posts
  FOR UPDATE USING (
    status = 'open' AND 
    EXISTS (SELECT 1 FROM public.taskers WHERE user_id = auth.uid() AND status = 'active')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON public.job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_city ON public.job_posts(city);
CREATE INDEX IF NOT EXISTS idx_job_posts_customer ON public.job_posts(customer_id);
