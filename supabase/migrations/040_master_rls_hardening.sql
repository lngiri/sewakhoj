-- 040_master_rls_hardening.sql
-- Comprehensive audit and hardening of all RLS policies for a smooth admin experience

-- 1. UNIFIED STAFF ACCESS FOR CORE TABLES
-- Ensure any member of staff_roles can manage site-wide entities

-- Services Table
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services" ON public.services
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.staff_roles))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.staff_roles));

-- Cities Table (Redo for consistency)
DROP POLICY IF EXISTS "Admins can manage cities" ON public.cities;
CREATE POLICY "Admins can manage cities" ON public.cities
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.staff_roles))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.staff_roles));

-- Site Settings Table (Redo for consistency)
DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.staff_roles))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.staff_roles));

-- 2. STAFF USER MANAGEMENT ACCESS
-- Allow staff to see all users and update them (for blocking/role management)
DROP POLICY IF EXISTS "Staff can view all users" ON public.users;
CREATE POLICY "Staff can view all users" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.staff_roles));

DROP POLICY IF EXISTS "Staff can update any user" ON public.users;
CREATE POLICY "Staff can update any user" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.staff_roles))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.staff_roles));

-- 3. KYC & VERIFICATION HARDENING
-- Ensure staff can manage KYC documents
DROP POLICY IF EXISTS "Staff can manage KYC" ON public.tasker_kyc;
CREATE POLICY "Staff can manage KYC" ON public.tasker_kyc
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.staff_roles))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.staff_roles));

-- 4. FINANCIAL & OPERATIONS CONSISTENCY
-- Taskers management (Verification, Blocking, Featured)
DROP POLICY IF EXISTS "Staff can manage all taskers" ON public.taskers;
CREATE POLICY "Staff can manage all taskers" ON public.taskers
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.staff_roles))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.staff_roles));

-- Booking Logs
DROP POLICY IF EXISTS "Staff can view all booking logs" ON public.booking_logs;
CREATE POLICY "Staff can view all booking logs" ON public.booking_logs
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.staff_roles));

-- 5. STORAGE ACCESS FOR STAFF (KYC)
-- Allow staff to see documents bucket for verification
DROP POLICY IF EXISTS "Staff can view all documents" ON storage.objects;
CREATE POLICY "Staff can view all documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documents' AND auth.uid() IN (SELECT user_id FROM public.staff_roles));

-- 6. REAL-TIME RELIABILITY (REPLICA IDENTITY)
-- Enable full replica identity for tables used in reactive UIs to ensure real-time updates always carry all columns
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.promo_codes REPLICA IDENTITY FULL;
ALTER TABLE public.cities REPLICA IDENTITY FULL;
ALTER TABLE public.site_settings REPLICA IDENTITY FULL;
ALTER TABLE public.tasker_locations REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 7. PUBLIC VISIBILITY GUARANTEE
-- Ensure anyone (even anonymous) can see active services and cities
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
CREATE POLICY "Anyone can view services" ON public.services
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view active cities" ON public.cities;
CREATE POLICY "Anyone can view active cities" ON public.cities
    FOR SELECT USING (is_active = true);
