-- Add account_status column to users table
-- Values: 'active' (default), 'deactivated', 'suspended'
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' NOT NULL;

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users (account_status);
