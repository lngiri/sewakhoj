-- Run this in Supabase SQL Editor to apply new tables

-- 040_push_notifications.sql - Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- 041_payment_gateways.sql - Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL CHECK (gateway IN ('esewa', 'khalti')),
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NPR',
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    gateway_ref TEXT,
    gateway_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;
CREATE POLICY "Users can read own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
CREATE POLICY "Users can create payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_ref ON public.payments(gateway_ref);

-- Trigger for payment completion
DROP FUNCTION IF EXISTS update_booking_paid_status() CASCADE;
CREATE OR REPLACE FUNCTION update_booking_paid_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.bookings SET status = 'paid' WHERE id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_completed ON public.payments;
CREATE TRIGGER trigger_payment_completed
AFTER UPDATE OF status ON public.payments
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION update_booking_paid_status();

-- 043_referral_rewards.sql - Referral system
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'joined', 'completed', 'rewarded')),
    reward_amount INTEGER DEFAULT 500,
    referrer_rewarded BOOLEAN DEFAULT false,
    referred_rewarded BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id);

-- Wallet system
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_withdrawn INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
CREATE POLICY "Users can view their own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.wallets;
CREATE POLICY "Users can insert their own wallet" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
CREATE POLICY "Users can update their own wallet" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('credit', 'debit')),
    amount INTEGER NOT NULL,
    source VARCHAR(50),
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions
    FOR SELECT USING (
        wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
    );

-- Create wallet on user signup
DROP FUNCTION IF EXISTS create_user_wallet() CASCADE;
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallets (user_id, balance, total_earned)
    VALUES (NEW.id, 0, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_wallet ON auth.users;
CREATE TRIGGER trigger_create_wallet
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_wallet();

-- Process referral on signup
DROP FUNCTION IF EXISTS process_referral_on_signup() CASCADE;
CREATE OR REPLACE FUNCTION process_referral_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    referrer_user UUID;
BEGIN
    IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
        SELECT id INTO referrer_user
        FROM auth.users
        WHERE raw_user_meta_data->>'referral_code' = NEW.raw_user_meta_data->>'referred_by';

        IF referrer_user IS NOT NULL THEN
            INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
            VALUES (referrer_user, NEW.id, NEW.raw_user_meta_data->>'referred_by', 'joined');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_process_referral ON auth.users;
CREATE TRIGGER trigger_process_referral
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION process_referral_on_signup();

-- Award referral reward on completed booking
DROP FUNCTION IF EXISTS award_referral_reward() CASCADE;
CREATE OR REPLACE FUNCTION award_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
    referral_record RECORD;
    referrer_wallet UUID;
    referred_wallet UUID;
    reward_amt INTEGER := 500;
BEGIN
    IF NEW.status = 'completed' THEN
        SELECT * INTO referral_record
        FROM public.referrals
        WHERE referred_id = NEW.customer_id
        AND status = 'joined';

        IF FOUND THEN
            SELECT id INTO referrer_wallet FROM public.wallets WHERE user_id = referral_record.referrer_id;
            SELECT id INTO referred_wallet FROM public.wallets WHERE user_id = referral_record.referred_id;

            IF referrer_wallet IS NOT NULL THEN
                UPDATE public.wallets
                SET balance = balance + reward_amt,
                    total_earned = total_earned + reward_amt,
                    updated_at = NOW()
                WHERE id = referrer_wallet;

                INSERT INTO public.wallet_transactions (wallet_id, type, amount, source, reference_id, description)
                VALUES (referrer_wallet, 'credit', reward_amt, 'referral', NEW.id, 'Referral reward');
            END IF;

            IF referred_wallet IS NOT NULL THEN
                UPDATE public.wallets
                SET balance = balance + reward_amt,
                    total_earned = total_earned + reward_amt,
                    updated_at = NOW()
                WHERE id = referred_wallet;

                INSERT INTO public.wallet_transactions (wallet_id, type, amount, source, reference_id, description)
                VALUES (referred_wallet, 'credit', reward_amt, 'referral', NEW.id, 'Welcome bonus');
            END IF;

            UPDATE public.referrals
            SET status = 'rewarded',
                completed_at = NOW()
            WHERE id = referral_record.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_referral_reward ON public.bookings;
CREATE TRIGGER trigger_referral_reward
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
    EXECUTE FUNCTION award_referral_reward();

-- 042_postgis_location.sql - PostGIS extension and location columns
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.taskers
  ADD COLUMN IF NOT EXISTS location geography(Point,4326);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS location geography(Point,4326);

CREATE INDEX IF NOT EXISTS idx_taskers_location ON public.taskers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users USING GIST(location);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
