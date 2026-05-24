-- Referral Rewards System
-- Part 1: Referrals tracking table
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

CREATE POLICY "Users can view their own referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id);

-- Part 2: Wallet system for credits
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

CREATE POLICY "Users can view their own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Part 3: Wallet transactions log
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

CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions
    FOR SELECT USING (
        wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
    );

-- Part 4: Function to create wallet for new users
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

-- Part 5: Function to process referral when user joins with code
CREATE OR REPLACE FUNCTION process_referral_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    referrer_user UUID;
    referral_record UUID;
BEGIN
    -- Check if user has a referral code in metadata
    IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
        -- Find the referrer
        SELECT id INTO referrer_user
        FROM auth.users
        WHERE raw_user_meta_data->>'referral_code' = NEW.raw_user_meta_data->>'referred_by';

        IF referrer_user IS NOT NULL THEN
            -- Create referral record
            INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
            VALUES (referrer_user, NEW.id, NEW.raw_user_meta_data->>'referred_by', 'joined');

            -- Update referrer's stats if they're a tasker (optional)
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_process_referral ON auth.users;
CREATE TRIGGER trigger_process_referral
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION process_referral_on_signup();

-- Part 6: Function to award referral reward when referred user completes first task
CREATE OR REPLACE FUNCTION award_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
    referral_record RECORD;
    referrer_wallet UUID;
    referred_wallet UUID;
    reward_amt INTEGER := 500;
BEGIN
    -- Check if this is the referred user's first completed booking
    IF NEW.status = 'completed' THEN
        SELECT * INTO referral_record
        FROM public.referrals
        WHERE referred_id = NEW.customer_id
        AND status = 'joined';

        IF FOUND THEN
            -- Get wallets
            SELECT id INTO referrer_wallet FROM public.wallets WHERE user_id = referral_record.referrer_id;
            SELECT id INTO referred_wallet FROM public.wallets WHERE user_id = referral_record.referred_id;

            -- Award referrer
            IF referrer_wallet IS NOT NULL THEN
                UPDATE public.wallets
                SET balance = balance + reward_amt,
                    total_earned = total_earned + reward_amt,
                    updated_at = NOW()
                WHERE id = referrer_wallet;

                INSERT INTO public.wallet_transactions (wallet_id, type, amount, source, reference_id, description)
                VALUES (referrer_wallet, 'credit', reward_amt, 'referral', NEW.id, 'Referral reward for ' || referral_record.referral_code);
            END IF;

            -- Award referred user
            IF referred_wallet IS NOT NULL THEN
                UPDATE public.wallets
                SET balance = balance + reward_amt,
                    total_earned = total_earned + reward_amt,
                    updated_at = NOW()
                WHERE id = referred_wallet;

                INSERT INTO public.wallet_transactions (wallet_id, type, amount, source, reference_id, description)
                VALUES (referred_wallet, 'credit', reward_amt, 'referral', NEW.id, 'Welcome bonus for joining via referral');
            END IF;

            -- Update referral status
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

-- Part 7: Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
