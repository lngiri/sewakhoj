-- Fix RLS for promo_codes to allow staff to manage them
-- Currently only SELECT is allowed for active codes

CREATE POLICY "Admins can manage promo codes" 
ON public.promo_codes 
FOR ALL 
TO authenticated 
USING (
    auth.uid() IN (SELECT user_id FROM public.staff_roles)
) 
WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.staff_roles)
);

-- Ensure anyone can still select active codes (existing policy 011/012)
-- Policy "Anyone can check promo codes" already exists:
-- CREATE POLICY "Anyone can check promo codes" ON public.promo_codes FOR SELECT USING (is_active = true);
