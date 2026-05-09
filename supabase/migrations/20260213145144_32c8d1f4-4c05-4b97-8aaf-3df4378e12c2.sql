-- Add DELETE policy for microsoft_workspace_connections
CREATE POLICY "Users can delete their own microsoft connection"
  ON public.microsoft_workspace_connections
  FOR DELETE
  USING ((auth.uid())::text = user_id);

-- Add server-side waitlist validation function
CREATE OR REPLACE FUNCTION public.insert_waitlist(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Validate name
  IF LENGTH(TRIM(p_name)) < 2 OR LENGTH(TRIM(p_name)) > 100 THEN
    RAISE EXCEPTION 'Name must be 2-100 characters';
  END IF;
  
  -- Validate email format
  IF NOT TRIM(p_email) ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  IF LENGTH(TRIM(p_email)) > 255 THEN
    RAISE EXCEPTION 'Email too long';
  END IF;
  
  -- Validate phone
  IF LENGTH(TRIM(p_phone)) < 7 OR LENGTH(TRIM(p_phone)) > 20 THEN
    RAISE EXCEPTION 'Phone must be 7-20 characters';
  END IF;
  
  -- Insert validated data
  INSERT INTO public.waitlist (name, email, phone)
  VALUES (TRIM(p_name), LOWER(TRIM(p_email)), TRIM(p_phone))
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace permissive INSERT policy with deny-direct-insert
DROP POLICY "Anyone can insert into waitlist" ON public.waitlist;
CREATE POLICY "Deny direct insert into waitlist" ON public.waitlist FOR INSERT WITH CHECK (false);