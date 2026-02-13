-- Add company_name and website columns to waitlist
ALTER TABLE public.waitlist ADD COLUMN company_name text;
ALTER TABLE public.waitlist ADD COLUMN website text;

-- Update the insert_waitlist RPC to accept and store the new fields
CREATE OR REPLACE FUNCTION public.insert_waitlist(p_name text, p_email text, p_phone text, p_company_name text DEFAULT NULL, p_website text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Validate company_name if provided
  IF p_company_name IS NOT NULL AND LENGTH(TRIM(p_company_name)) > 200 THEN
    RAISE EXCEPTION 'Company name too long';
  END IF;

  -- Validate website if provided
  IF p_website IS NOT NULL AND LENGTH(TRIM(p_website)) > 500 THEN
    RAISE EXCEPTION 'Website too long';
  END IF;
  
  -- Insert validated data
  INSERT INTO public.waitlist (name, email, phone, company_name, website)
  VALUES (
    TRIM(p_name),
    LOWER(TRIM(p_email)),
    TRIM(p_phone),
    NULLIF(TRIM(COALESCE(p_company_name, '')), ''),
    NULLIF(TRIM(COALESCE(p_website, '')), '')
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;