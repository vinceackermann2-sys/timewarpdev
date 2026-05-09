
-- Fix 1: Restrict referrals INSERT to only allow 'pending' as referred_email
-- This prevents users from inserting arbitrary email addresses
CREATE OR REPLACE FUNCTION public.validate_referral_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_email IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'referred_email must be "pending" on insert';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_referral_insert
  BEFORE INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_referral_insert();

-- Fix 2: Restrict workspace_invitations SELECT to admins only
DROP POLICY "Members can view invitations" ON public.workspace_invitations;

CREATE POLICY "Admins can view invitations"
  ON public.workspace_invitations FOR SELECT
  TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

-- Fix 3: Restrict email-assets uploads to authenticated users only
-- and limit to image content types
CREATE POLICY "Authenticated users can upload email assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'email-assets'
    AND (storage.extension(name) IN ('png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'))
  );
