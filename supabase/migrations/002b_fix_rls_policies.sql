-- Add INSERT policy for users table
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Also add policy for service role to insert (for OAuth callback)
-- This allows the callback route to create user profiles
CREATE POLICY "Service role can insert users" ON public.users
  FOR INSERT WITH CHECK (true);
