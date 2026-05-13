-- Expand users table to support more profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['Nepali'];

-- Expand taskers table to support onboarding fields
ALTER TABLE taskers ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE taskers ADD COLUMN IF NOT EXISTS working_days INTEGER[];
ALTER TABLE taskers ADD COLUMN IF NOT EXISTS working_hours JSONB;
ALTER TABLE taskers ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false;
ALTER TABLE taskers ADD COLUMN IF NOT EXISTS documents JSONB;

-- Create storage bucket for verification documents (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
