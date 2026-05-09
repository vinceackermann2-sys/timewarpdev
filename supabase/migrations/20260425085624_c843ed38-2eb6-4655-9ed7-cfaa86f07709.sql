ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referrer_celebrated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS referred_celebrated_at timestamp with time zone;

-- Allow the referrer to mark their own celebration as shown
CREATE POLICY "Referrer can mark celebration shown"
ON public.referrals
FOR UPDATE
TO authenticated
USING (referrer_id = auth.uid())
WITH CHECK (referrer_id = auth.uid());

-- Allow the referred user to mark their celebration as shown
CREATE POLICY "Referred user can mark celebration shown"
ON public.referrals
FOR UPDATE
TO authenticated
USING (referred_user_id = auth.uid())
WITH CHECK (referred_user_id = auth.uid());