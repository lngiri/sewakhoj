-- Phase 1: Security & Super Admin Role Management

CREATE TYPE staff_role AS ENUM ('super_admin', 'admin', 'support', 'finance');

CREATE TABLE IF NOT EXISTS public.staff_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role staff_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role
CREATE POLICY "Users can read their own staff role" ON public.staff_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Super Admins can read all roles
CREATE POLICY "Super Admins can read all staff roles" ON public.staff_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super Admins can manage all roles
CREATE POLICY "Super Admins can manage staff roles" ON public.staff_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.staff_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Important Note: Since there is no super_admin right now, 
-- you (the owner) must manually insert your own user_id into this table 
-- via the Supabase dashboard to bootstrap the first Super Admin.
-- Example: INSERT INTO public.staff_roles (user_id, role) VALUES ('your-uuid', 'super_admin');
