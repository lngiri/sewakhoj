-- Complete SewaKhoj Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  phone TEXT UNIQUE,
  email TEXT,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  dob DATE,
  gender TEXT,
  area TEXT,
  address TEXT,
  city TEXT,
  languages TEXT[] DEFAULT ARRAY['Nepali'],
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'tasker')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Taskers table
CREATE TABLE IF NOT EXISTS public.taskers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  services TEXT[] DEFAULT ARRAY[]::TEXT[],
  experience TEXT,
  hourly_rate INTEGER,
  city TEXT,
  area TEXT,
  working_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}'::jsonb,
  id_verified BOOLEAN DEFAULT false,
  documents JSONB DEFAULT '[]'::jsonb,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  bio TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ne TEXT,
  description TEXT,
  icon TEXT,
  base_price INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tasker_id UUID REFERENCES public.taskers(id) ON DELETE SET NULL,
  service TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  hours INTEGER DEFAULT 2,
  total_amount INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in-progress', 'completed', 'cancelled')),
  address TEXT,
  notes TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tasker_id UUID REFERENCES public.taskers(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taskers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Public can view tasker profiles" ON public.users;
CREATE POLICY "Public can view tasker profiles" ON public.users
  FOR SELECT USING (true);

-- Taskers policies
DROP POLICY IF EXISTS "Anyone can view active taskers" ON public.taskers;
CREATE POLICY "Anyone can view active taskers" ON public.taskers
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Taskers can view own profile" ON public.taskers;
CREATE POLICY "Taskers can view own profile" ON public.taskers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Taskers can update own profile" ON public.taskers;
CREATE POLICY "Taskers can update own profile" ON public.taskers
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Taskers can insert own profile" ON public.taskers;
CREATE POLICY "Taskers can insert own profile" ON public.taskers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Services policies
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
CREATE POLICY "Anyone can view services" ON public.services
  FOR SELECT USING (true);

-- Bookings policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() = customer_id OR
    auth.uid() IN (SELECT user_id FROM public.taskers WHERE id = tasker_id)
  );

DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
CREATE POLICY "Customers can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (
    auth.uid() = customer_id OR
    auth.uid() IN (SELECT user_id FROM public.taskers WHERE id = tasker_id)
  );

-- Reviews policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;
CREATE POLICY "Customers can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Insert default services
INSERT INTO public.services (name, name_ne, description, icon, base_price) VALUES
('Plumbing', 'प्लम्बिङ', 'Pipe repair, faucet installation, leak fixing', '🔧', 500),
('Cleaning', 'सफाइ', 'Home cleaning, deep cleaning, bathroom cleaning', '🧹', 400),
('Electrical', 'इलेक्ट्रिकल', 'Wiring, switch repair, appliance installation', '⚡', 600),
('Tutoring', 'ट्युशन', 'Academic tutoring, language classes', '📚', 300),
('Carpentry', 'काठको काम', 'Furniture repair, custom woodwork', '🪚', 550),
('Painting', 'रङ लगाउने', 'Interior painting, exterior painting', '🎨', 450),
('Appliance Repair', 'उपकरण मर्मत', 'Fridge, washing machine, AC repair', '🔧', 500),
('Gardening', 'बगैंचा', 'Lawn mowing, plant care, landscaping', '🌱', 350)
ON CONFLICT DO NOTHING;

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT DO NOTHING;

-- Storage policies for documents
DROP POLICY IF EXISTS "Users can upload their documents" ON storage.objects;
CREATE POLICY "Users can upload their documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their documents" ON storage.objects;
CREATE POLICY "Users can view their documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_taskers_city ON public.taskers(city);
CREATE INDEX IF NOT EXISTS idx_taskers_status ON public.taskers(status);
CREATE INDEX IF NOT EXISTS idx_taskers_rating ON public.taskers(rating);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tasker ON public.bookings(tasker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_tasker ON public.reviews(tasker_id);
