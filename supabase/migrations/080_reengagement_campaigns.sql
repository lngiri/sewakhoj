-- Migration 080: Re-engagement Campaign Engine
-- Covers: Automated re-engagement flows for dormant users
-- Works with: find_dormant_users() from migration 055, notifications table from migration 020

-- ============================================================================
-- 1. Re-engagement Campaigns Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reengagement_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    dormant_customer_count INTEGER DEFAULT 0,
    dormant_tasker_count INTEGER DEFAULT 0,
    notifications_created INTEGER DEFAULT 0,
    sms_scheduled INTEGER DEFAULT 0,
    email_scheduled INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reengagement_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view re-engagement campaigns" ON public.reengagement_campaigns
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

CREATE POLICY "Admins can insert re-engagement campaigns" ON public.reengagement_campaigns
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

-- ============================================================================
-- 2. Re-engagement Message Templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reengagement_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_role TEXT NOT NULL CHECK (target_role IN ('customer', 'tasker')),
    channel TEXT NOT NULL CHECK (channel IN ('notification', 'sms', 'email')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reengagement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage re-engagement templates" ON public.reengagement_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

CREATE POLICY "Anyone can read active templates" ON public.reengagement_templates
    FOR SELECT USING (is_active = true);

-- Seed default templates
INSERT INTO public.reengagement_templates (target_role, channel, title, body) VALUES
    ('customer', 'notification', 'We Miss You! 🏠', 'It''s been a while since your last visit to SewaKhoj. Browse trusted taskers in your area and get your chores done today!'),
    ('tasker', 'notification', 'New Jobs Waiting For You! 🔧', 'You haven''t logged in recently. Customers are looking for skilled taskers like you — don''t miss out on new booking opportunities!'),
    ('customer', 'sms', 'Come Back to SewaKhoj!', 'Hi {{name}}, it''s been a while! Browse top-rated taskers near you and complete your first booking. Reply HELP for assistance. - SewaKhoj'),
    ('tasker', 'sms', 'Don''t Miss Out on Jobs!', 'Hi {{name}}, customers are searching for your skills. Log in to SewaKhoj to check new booking requests and grow your business. - SewaKhoj')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. Core Campaign Execution Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_reengagement_campaign(
    p_triggered_by UUID DEFAULT NULL,
    p_customer_days INTEGER DEFAULT 30,
    p_tasker_days INTEGER DEFAULT 30,
    p_channels TEXT[] DEFAULT ARRAY['notification'] -- channels to use: notification, sms, email
)
RETURNS UUID AS $$
DECLARE
    v_campaign_id UUID;
    v_dormant_customers INTEGER := 0;
    v_dormant_taskers INTEGER := 0;
    v_notifications INTEGER := 0;
    v_sms_count INTEGER := 0;
    v_email_count INTEGER := 0;
    v_user RECORD;
    v_template RECORD;
    v_body TEXT;
BEGIN
    -- Create campaign record
    INSERT INTO public.reengagement_campaigns (
        triggered_by, status, details
    ) VALUES (
        p_triggered_by, 'running',
        jsonb_build_object(
            'customer_days_threshold', p_customer_days,
            'tasker_days_threshold', p_tasker_days,
            'channels', p_channels
        )
    ) RETURNING id INTO v_campaign_id;

    -- Process dormant customers
    FOR v_user IN
        SELECT * FROM public.find_dormant_users(p_customer_days, 'customer')
    LOOP
        v_dormant_customers := v_dormant_customers + 1;

        -- Create in-app notification
        IF 'notification' = ANY(p_channels) THEN
            SELECT title, body INTO v_template
            FROM public.reengagement_templates
            WHERE target_role = 'customer' AND channel = 'notification' AND is_active = true
            ORDER BY created_at ASC LIMIT 1;

            IF FOUND THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (
                    v_user.user_id,
                    v_template.title,
                    v_template.body,
                    'info',
                    '/browse'
                );
                v_notifications := v_notifications + 1;
            END IF;
        END IF;

        -- Schedule SMS (will be sent by external processor or API)
        IF 'sms' = ANY(p_channels) THEN
            SELECT title, body INTO v_template
            FROM public.reengagement_templates
            WHERE target_role = 'customer' AND channel = 'sms' AND is_active = true
            ORDER BY created_at ASC LIMIT 1;

            IF FOUND AND v_user.phone IS NOT NULL THEN
                v_body := REPLACE(v_template.body, '{{name}}', COALESCE(v_user.full_name, 'there'));
                -- Insert into a queue table for SMS dispatch
                INSERT INTO public.sms_queue (user_id, phone, message, purpose)
                VALUES (v_user.user_id, v_user.phone, v_body, 'reengagement')
                ON CONFLICT DO NOTHING;
                v_sms_count := v_sms_count + 1;
            END IF;
        END IF;

        -- Schedule Email
        IF 'email' = ANY(p_channels) THEN
            IF v_user.email IS NOT NULL THEN
                INSERT INTO public.email_queue (user_id, email, subject, template_name, template_data, purpose)
                VALUES (
                    v_user.user_id,
                    v_user.email,
                    'We Miss You at SewaKhoj!',
                    'reengagement_customer',
                    jsonb_build_object('name', v_user.full_name, 'days_inactive', v_user.days_inactive),
                    'reengagement'
                )
                ON CONFLICT DO NOTHING;
                v_email_count := v_email_count + 1;
            END IF;
        END IF;
    END LOOP;

    -- Process dormant taskers
    FOR v_user IN
        SELECT * FROM public.find_dormant_users(p_tasker_days, 'tasker')
    LOOP
        v_dormant_taskers := v_dormant_taskers + 1;

        -- Create in-app notification
        IF 'notification' = ANY(p_channels) THEN
            SELECT title, body INTO v_template
            FROM public.reengagement_templates
            WHERE target_role = 'tasker' AND channel = 'notification' AND is_active = true
            ORDER BY created_at ASC LIMIT 1;

            IF FOUND THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (
                    v_user.user_id,
                    v_template.title,
                    v_template.body,
                    'info',
                    '/dashboard'
                );
                v_notifications := v_notifications + 1;
            END IF;
        END IF;

        -- Schedule SMS
        IF 'sms' = ANY(p_channels) THEN
            SELECT title, body INTO v_template
            FROM public.reengagement_templates
            WHERE target_role = 'tasker' AND channel = 'sms' AND is_active = true
            ORDER BY created_at ASC LIMIT 1;

            IF FOUND AND v_user.phone IS NOT NULL THEN
                v_body := REPLACE(v_template.body, '{{name}}', COALESCE(v_user.full_name, 'there'));
                INSERT INTO public.sms_queue (user_id, phone, message, purpose)
                VALUES (v_user.user_id, v_user.phone, v_body, 'reengagement')
                ON CONFLICT DO NOTHING;
                v_sms_count := v_sms_count + 1;
            END IF;
        END IF;

        -- Schedule Email
        IF 'email' = ANY(p_channels) THEN
            IF v_user.email IS NOT NULL THEN
                INSERT INTO public.email_queue (user_id, email, subject, template_name, template_data, purpose)
                VALUES (
                    v_user.user_id,
                    v_user.email,
                    'New Jobs Waiting for You at SewaKhoj!',
                    'reengagement_tasker',
                    jsonb_build_object('name', v_user.full_name, 'days_inactive', v_user.days_inactive),
                    'reengagement'
                )
                ON CONFLICT DO NOTHING;
                v_email_count := v_email_count + 1;
            END IF;
        END IF;
    END LOOP;

    -- Update campaign with results
    UPDATE public.reengagement_campaigns SET
        dormant_customer_count = v_dormant_customers,
        dormant_tasker_count = v_dormant_taskers,
        notifications_created = v_notifications,
        sms_scheduled = v_sms_count,
        email_scheduled = v_email_count,
        status = 'completed',
        details = details || jsonb_build_object(
            'completed_at', NOW()::TEXT,
            'customer_days_threshold', p_customer_days,
            'tasker_days_threshold', p_tasker_days
        )
    WHERE id = v_campaign_id;

    RETURN v_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.run_reengagement_campaign IS 'Executes a full re-engagement campaign: finds dormant users, creates notifications, and schedules SMS/email. Returns campaign UUID.';

-- ============================================================================
-- 4. SMS Queue Table (for batched SMS dispatch)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sms_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    purpose TEXT DEFAULT 'general' CHECK (purpose IN ('general', 'reengagement', 'reminder', 'notification')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, purpose, status) -- prevent duplicate pending entries per user per purpose
);

ALTER TABLE public.sms_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage SMS queue" ON public.sms_queue
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

-- ============================================================================
-- 5. Email Queue Table (for batched email dispatch)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_name TEXT NOT NULL,
    template_data JSONB DEFAULT '{}'::jsonb,
    purpose TEXT DEFAULT 'general' CHECK (purpose IN ('general', 'reengagement', 'notification', 'transactional')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, purpose, status)
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email queue" ON public.email_queue
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

-- ============================================================================
-- 6. Dormant User Stats Function (for admin dashboard)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dormant_user_stats(
    p_customer_days INTEGER DEFAULT 30,
    p_tasker_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    role TEXT,
    dormant_count BIGINT,
    avg_days_inactive NUMERIC,
    oldest_dormant_days INTEGER,
    sample_users JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.role,
        COUNT(*)::BIGINT AS dormant_count,
        ROUND(AVG(EXTRACT(DAY FROM (NOW() - u.last_active_at))), 1) AS avg_days_inactive,
        MAX(EXTRACT(DAY FROM (NOW() - u.last_active_at)))::INTEGER AS oldest_dormant_days,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', u.id,
                    'full_name', u.full_name,
                    'phone', u.phone,
                    'email', u.email,
                    'days_inactive', EXTRACT(DAY FROM (NOW() - u.last_active_at))::INTEGER
                )
                ORDER BY u.last_active_at ASC
            ) FILTER (WHERE u.id IS NOT NULL),
            '[]'::jsonb
        ) AS sample_users
    FROM public.users u
    WHERE u.last_active_at < NOW() - (
        CASE WHEN u.role = 'customer' THEN p_customer_days ELSE p_tasker_days END || ' days'
    )::INTERVAL
      AND u.account_status = 'active'
      AND u.role IN ('customer', 'tasker')
    GROUP BY u.role
    ORDER BY u.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_dormant_user_stats IS 'Returns aggregated stats about dormant users, grouped by role, for the admin re-engagement dashboard.';

-- ============================================================================
-- 7. Campaign History Stats Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_campaign_stats()
RETURNS TABLE(
    total_campaigns BIGINT,
    total_notifications_sent BIGINT,
    total_sms_scheduled BIGINT,
    total_email_scheduled BIGINT,
    last_campaign_at TIMESTAMPTZ,
    total_dormant_contacted BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COALESCE(SUM(notifications_created), 0)::BIGINT,
        COALESCE(SUM(sms_scheduled), 0)::BIGINT,
        COALESCE(SUM(email_scheduled), 0)::BIGINT,
        MAX(run_at),
        COALESCE(SUM(dormant_customer_count + dormant_tasker_count), 0)::BIGINT
    FROM public.reengagement_campaigns;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON public.sms_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reengagement_campaigns_run_at ON public.reengagement_campaigns(run_at DESC);