-- Create cities table
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    name_np TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access for cities" ON public.cities
    FOR SELECT USING (is_active = true);

-- Allow admins to manage cities
CREATE POLICY "Allow admins to manage cities" ON public.cities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Insert initial cities
INSERT INTO public.cities (name, name_np) VALUES
('Kathmandu', 'काठमाडौं'),
('Lalitpur', 'ललितपुर'),
('Bhaktapur', 'भक्तपुर'),
('Pokhara', 'पोखरा'),
('Chitwan', 'चितवन'),
('Butwal', 'बुटवल'),
('Biratnagar', 'विराटनगर'),
('Dharan', 'धरान')
ON CONFLICT (name) DO NOTHING;
