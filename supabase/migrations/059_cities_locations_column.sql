-- Migration 059: Connect cities table to frontend location picker
-- Adds locations (areas/wards) column to cities table
-- Seeds existing cities with their known areas

-- ============================================================================
-- 1. Add locations column to cities table
-- ============================================================================
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS locations TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ============================================================================
-- 2. Seed locations for existing cities
-- ============================================================================
UPDATE public.cities SET locations = ARRAY['Baneshwor','Thamel','Lazimpat','Baluwatar','Maharajgunj','Sanepa','Jhamsikhel','Kupondole','Kalimati','New Baneshwor','Koteshwor','Boudha','Chabahil','Dillibazar','Putalisadak','Bagbazar','Asan','Indrachowk','New Road','Durbar Marg','Kamaladi','Tripureshwor','Kalanki','Swayambhu','Naxal','Bansbari'] WHERE name = 'Kathmandu' AND (locations IS NULL OR array_length(locations, 1) IS NULL OR array_length(locations, 1) = 0);
UPDATE public.cities SET locations = ARRAY['Patan','Pulchowk','Jawalakhel','Patan Dhoka','Satdobato','Lagankhel','Sanepa','Jhamsikhel','Kupondole'] WHERE name = 'Lalitpur' AND (locations IS NULL OR array_length(locations, 1) IS NULL OR array_length(locations, 1) = 0);
UPDATE public.cities SET locations = ARRAY['Bhaktapur','Suryabinayak','Bode','Thimi','Siddhapur','Changunarayan','Madhyapur Thimi'] WHERE name = 'Bhaktapur' AND (locations IS NULL OR array_length(locations, 1) IS NULL OR array_length(locations, 1) = 0);
UPDATE public.cities SET locations = ARRAY['Lakeside','Chipledhunga','Mahendrapul','Baidam','Hemja'] WHERE name = 'Pokhara' AND (locations IS NULL OR array_length(locations, 1) IS NULL OR array_length(locations, 1) = 0);
UPDATE public.cities SET locations = ARRAY['Bharatpur','Narayanghat','Ratnanagar','Tadi','Sauraha'] WHERE name = 'Chitwan' AND (locations IS NULL OR array_length(locations, 1) IS NULL OR array_length(locations, 1) = 0);
UPDATE public.cities SET locations = ARRAY['Butwal'] WHERE name = 'Butwal' AND (locations IS NULL OR array_length(locations, 1) IS NULL OR array_length(locations, 1) = 0);
UPDATE public.cities SET locations = ARRAY['Biratnagar'] WHERE name = 'Biratnagar' AND (locations IS NULL OR array_length(locations, 1) IS NULL OR array_length(locations, 1) = 0);
UPDATE public.cities SET locations = ARRAY['Dharan'] WHERE name = 'Dharan' AND (locations IS NULL OR array_length(locations, 1) IS NULL OR array_length(locations, 1) = 0);

-- ============================================================================
-- 3. Insert any missing cities from the hardcoded list
-- ============================================================================
INSERT INTO public.cities (name, name_np, is_active, locations) VALUES
  ('Itahari', 'इटहरी', true, ARRAY['Itahari']),
  ('Inaruwa', 'इनरुवा', true, ARRAY['Inaruwa']),
  ('Birtamod', 'बिर्तामोड', true, ARRAY['Birtamod']),
  ('Damak', 'दमक', true, ARRAY['Damak']),
  ('Bhairahawa', 'भैरहवा', true, ARRAY['Bhairahawa']),
  ('Nepalgunj', 'नेपालगन्ज', true, ARRAY['Nepalgunj']),
  ('Birgunj', 'वीरगन्ज', true, ARRAY['Birgunj']),
  ('Hetauda', 'हेटौंडा', true, ARRAY['Hetauda']),
  ('Janakpur', 'जनकपुर', true, ARRAY['Janakpur']),
  ('Dhading', 'धादिङ', true, ARRAY['Dhading']),
  ('Nuwakot', 'नुवाकोट', true, ARRAY['Nuwakot']),
  ('Kirtipur', 'कीर्तिपुर', true, ARRAY['Kirtipur','Panga'])
ON CONFLICT (name) DO UPDATE SET locations = EXCLUDED.locations WHERE cities.locations IS NULL OR array_length(cities.locations, 1) IS NULL OR array_length(cities.locations, 1) = 0;
