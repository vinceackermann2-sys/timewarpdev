
-- Fix RLS policies on referrals - they're all RESTRICTIVE which blocks everything
-- Drop restrictive and recreate as permissive
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;

CREATE POLICY "Users can view own referrals"
ON public.referrals FOR SELECT TO authenticated
USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Users can create referrals"
ON public.referrals FOR INSERT TO authenticated
WITH CHECK (referrer_id = auth.uid());
