-- Migration 013: Account & Tasker Growth Fields
ALTER TABLE taskers
ADD COLUMN IF NOT EXISTS service_radius INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS availability_hours JSONB DEFAULT '{"mon": [], "tue": [], "wed": [], "thu": [], "fri": [], "sat": [], "sun": []}',
ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '{"monthly_target": 0, "daily_hours": 0}',
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);

-- Populate referral codes for existing users
UPDATE users SET referral_code = 'SK-' || UPPER(SUBSTRING(id::text, 1, 6)) WHERE referral_code IS NULL;
