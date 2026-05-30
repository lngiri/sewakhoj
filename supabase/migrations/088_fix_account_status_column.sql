-- Migration 088: Fix missing account_status column
-- The admin_get_all_users() RPC function references u.account_status,
-- but the column was never added. This migration adds it.
-- Based on migration 043c which was never applied.

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users (account_status);
