import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmptjdwhpgvoyeocccsg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwNTUwMSwiZXhwIjoyMDkzMTgxNTAxfQ.YkxP7cw80ZdOnnKCQYbX47slE3BvglcJT3qY1vQMUik';

const supabase = createClient(supabaseUrl, serviceRoleKey);

// SQL statements to apply new migrations
const migrations = [
  // 040_push_notifications.sql
  `
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
  `,

  // 041_payment_gateways.sql
  `
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
  `,

  // 043_referral_rewards.sql
  `
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
                    VALUES (referrer_wallet, 'credit', reward_amt, 'referral', NEW.id, 'Referral reward for ' || referral_record.referral_code);
                END IF;

                IF referred_wallet IS NOT NULL THEN
                    UPDATE public.wallets
                    SET balance = balance + reward_amt,
                        total_earned = total_earned + reward_amt,
                        updated_at = NOW()
                    WHERE id = referred_wallet;

                    INSERT INTO public.wallet_transactions (wallet_id, type, amount, source, reference_id, description)
                    VALUES (referred_wallet, 'credit', reward_amt, 'referral', NEW.id, 'Welcome bonus for joining via referral');
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

    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON public.referrals(referral_code);
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
  `,

  // 042_postgis_location.sql
  `
    CREATE EXTENSION IF NOT EXISTS postgis;

    ALTER TABLE public.taskers
      ADD COLUMN IF NOT EXISTS location geography(Point,4326);

    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS location geography(Point,4326);

    CREATE INDEX IF NOT EXISTS idx_taskers_location ON public.taskers USING GIST(location);
    CREATE INDEX IF NOT EXISTS idx_users_location ON public.users USING GIST(location);
  `,

  // 082_remove_plaintext_api_keys.sql
  `
    -- ============================================================================
    -- 1. Safe retrieval function (avoids RLS — uses service_role client)
    -- ============================================================================
    CREATE OR REPLACE FUNCTION public.get_api_credential(
        p_service_name TEXT,
        p_credential_type TEXT DEFAULT 'api_key'
    )
    RETURNS TEXT
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        v_result TEXT;
    BEGIN
        IF p_credential_type = 'api_key' THEN
            SELECT decrypt_api_key(encrypted_api_key) INTO v_result
            FROM public.api_integrations
            WHERE service_name = p_service_name AND is_enabled = true;
        ELSIF p_credential_type = 'api_secret' THEN
            SELECT decrypt_api_key(encrypted_api_secret) INTO v_result
            FROM public.api_integrations
            WHERE service_name = p_service_name AND is_enabled = true;
        ELSE
            RETURN NULL;
        END IF;
        RETURN v_result;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.get_api_credential(TEXT, TEXT) TO service_role;

    -- ============================================================================
    -- 2. Drop the plain-text columns
    -- ============================================================================
    ALTER TABLE public.api_integrations
        DROP COLUMN IF EXISTS api_key,
        DROP COLUMN IF EXISTS api_secret;

    -- ============================================================================
    -- 3. Update column-level grants
    -- ============================================================================
    GRANT SELECT (
        id, service_name, endpoint_url, merchant_id, is_enabled,
        configuration, encrypted_api_key, encrypted_api_secret,
        updated_at, updated_by
    ) ON public.api_integrations TO authenticated;

    GRANT SELECT (
        id, service_name, endpoint_url, merchant_id, is_enabled,
        configuration, updated_at, updated_by
    ) ON public.api_integrations TO anon;
  `,

  // 083_guard_tasker_skills_column.sql
  `
    CREATE OR REPLACE FUNCTION public.guard_tasker_skills_column()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.skills IS DISTINCT FROM OLD.skills THEN
        RAISE WARNING 'Direct write to taskers.skills detected (tasker_id: %). Use public.tasker_skills junction table instead.',
          COALESCE(NEW.id, OLD.id);
        NEW.skills = OLD.skills;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_guard_tasker_skills ON public.taskers;
    CREATE TRIGGER trg_guard_tasker_skills
      BEFORE UPDATE OF skills ON public.taskers
      FOR EACH ROW
      EXECUTE FUNCTION public.guard_tasker_skills_column();
  `
];

async function applyMigration(index) {
  if (index >= migrations.length) {
    console.log('All migrations applied successfully!');
    return;
  }

  console.log(`Applying migration ${index + 1}/${migrations.length}...`);

  const { error } = await supabase.rpc('sql', { query: migrations[index] });

  if (error) {
    console.error(`Error applying migration ${index + 1}:`, error);
    // Try to continue with next migration
    await applyMigration(index + 1);
  } else {
    console.log(`Migration ${index + 1} applied successfully!`);
    await applyMigration(index + 1);
  }
}

applyMigration(0).catch(console.error);
