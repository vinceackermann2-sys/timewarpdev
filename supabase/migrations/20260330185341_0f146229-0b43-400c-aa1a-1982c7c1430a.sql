
ALTER TABLE public.ai_employees DROP CONSTRAINT ai_employees_linked_business_id_fkey;
ALTER TABLE public.ai_employees ADD CONSTRAINT ai_employees_linked_business_id_fkey FOREIGN KEY (linked_business_id) REFERENCES public.user_business_data(id) ON DELETE SET NULL;

ALTER TABLE public.user_connections DROP CONSTRAINT user_connections_brand_id_fkey;
ALTER TABLE public.user_connections ADD CONSTRAINT user_connections_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.user_business_data(id) ON DELETE SET NULL;
