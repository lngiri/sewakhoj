-- Migration 018: Add Featured Demo Taskers with Photos

-- First, let's insert 6 realistic users
INSERT INTO users (id, full_name, phone, role, avatar_url, city, area)
VALUES 
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c40', 'Suresh Gurung', '+9779800000001', 'tasker', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=200', 'Kathmandu', 'Baneshwor'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c41', 'Anjali Shrestha', '+9779800000002', 'tasker', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=200', 'Lalitpur', 'Patan'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c42', 'Prakash Thapa', '+9779800000003', 'tasker', 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=200', 'Pokhara', 'Lakeside'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c43', 'Nirajan Karki', '+9779800000004', 'tasker', 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=200', 'Bhaktapur', 'Suryabinayak'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c44', 'Sunita Magar', '+9779800000005', 'tasker', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', 'Kathmandu', 'Koteshwor'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c45', 'Bikash Tamang', '+9779800000006', 'tasker', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=200', 'Lalitpur', 'Jawalakhel')
ON CONFLICT (id) DO UPDATE SET 
  avatar_url = EXCLUDED.avatar_url, 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Insert their tasker profiles with is_featured = true
INSERT INTO taskers (user_id, status, city, area, skills, hourly_rate, bio, rating, total_jobs, is_featured, id_verified, transportation_mode)
VALUES 
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c40', 'active', 'Kathmandu', 'Baneshwor', ARRAY['plumbing', 'electrical'], 600, 'Expert plumber and electrician with 12 years of hands-on experience resolving household issues quickly.', 4.9, 142, true, true, 'motorcycle'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c41', 'active', 'Lalitpur', 'Patan', ARRAY['cleaning'], 450, 'Meticulous cleaner specializing in deep home cleaning, sanitization, and organization.', 4.8, 89, true, true, 'public_transit'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c42', 'active', 'Pokhara', 'Lakeside', ARRAY['painting'], 700, 'Custom woodwork, furniture repair, and professional carpentry services.', 5.0, 56, true, true, 'car'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c43', 'active', 'Bhaktapur', 'Suryabinayak', ARRAY['electrical', 'tech-help'], 650, 'Certified electrician. I fix wiring, AC units, refrigerators, and more.', 4.7, 112, true, true, 'motorcycle'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c44', 'active', 'Kathmandu', 'Koteshwor', ARRAY['tutoring'], 500, 'Passionate tutor specializing in High School Mathematics and Science.', 4.9, 74, true, true, 'walking'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c45', 'active', 'Lalitpur', 'Jawalakhel', ARRAY['painting'], 550, 'Professional painter with experience in both interior and exterior house painting.', 4.8, 63, true, true, 'bicycle')
ON CONFLICT (user_id) DO UPDATE SET 
  is_featured = true, 
  status = 'active', 
  rating = EXCLUDED.rating, 
  skills = EXCLUDED.skills, 
  hourly_rate = EXCLUDED.hourly_rate;
