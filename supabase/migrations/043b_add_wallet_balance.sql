-- Add wallet reference to users for easier access
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0;