-- Create cities table
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  name_np TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Anyone can view active cities
CREATE POLICY "Anyone can view cities" ON public.cities
  FOR SELECT USING (is_active = true);

-- Admins can manage cities (we'll check against staff_roles or just true for now if admin access is handled elsewhere)
-- We will use the same policy as other admin tasks
CREATE POLICY "Admins can manage cities" ON public.cities
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.staff_roles));

-- Insert initial cities
INSERT INTO public.cities (name, name_np, is_active) VALUES
  ('Kathmandu', 'काठमाडौं', true),
  ('Lalitpur', 'ललितपुर', true),
  ('Bhaktapur', 'भक्तपुर', true),
  ('Pokhara', 'पोखरा', true),
  ('Chitwan', 'चितवन', true),
  ('Butwal', 'बुटवल', true),
  ('Biratnagar', 'विराटनगर', true),
  ('Dharan', 'धरान', true)
ON CONFLICT (name) DO NOTHING;
