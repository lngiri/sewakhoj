
-- Seed Users
INSERT INTO users (id, full_name, phone, role, avatar_url)
VALUES 
  ('337f575f-8f54-4f74-b762-3b22810d4239', 'Ram Bahadur', '+9779812345678', 'tasker', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ram'),
  ('337f575f-8f54-4f74-b762-3b22810d4240', 'Sita Sharma', '+9779812345679', 'tasker', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sita'),
  ('337f575f-8f54-4f74-b762-3b22810d4241', 'Hari Prasad', '+9779812345680', 'tasker', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hari'),
  ('337f575f-8f54-4f74-b762-3b22810d4242', 'Krishna Thapa', '+9779812345681', 'tasker', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Krishna')
ON CONFLICT (id) DO NOTHING;

-- Seed Taskers
INSERT INTO taskers (id, user_id, status, city, skills, hourly_rate, bio, rating, total_tasks, transportation_mode)
VALUES 
  (gen_random_uuid(), '337f575f-8f54-4f74-b762-3b22810d4239', 'active', 'kathmandu', ARRAY['plumbing', 'electrical'], 500, 'Professional plumber with 10 years of experience.', 4.9, 120, 'motorcycle'),
  (gen_random_uuid(), '337f575f-8f54-4f74-b762-3b22810d4240', 'active', 'pokhara', ARRAY['cleaning'], 400, 'Expert in deep cleaning and home organization.', 4.8, 85, 'car'),
  (gen_random_uuid(), '337f575f-8f54-4f74-b762-3b22810d4241', 'active', 'lalitpur', ARRAY['tutoring'], 600, 'Math and Science tutor for high school students.', 4.7, 50, 'public_transit'),
  (gen_random_uuid(), '337f575f-8f54-4f74-b762-3b22810d4242', 'active', 'bhaktapur', ARRAY['cooking'], 550, 'Specialized in Nepali and Indian cuisine.', 4.9, 200, 'bicycle')
ON CONFLICT DO NOTHING;
