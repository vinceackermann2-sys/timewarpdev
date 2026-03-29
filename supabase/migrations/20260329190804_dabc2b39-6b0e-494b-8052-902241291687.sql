
DROP POLICY "Anyone can read config" ON public.platform_config;

CREATE POLICY "Public can read safe config"
  ON public.platform_config FOR SELECT
  TO public
  USING (key IN ('og_spots_remaining'));
