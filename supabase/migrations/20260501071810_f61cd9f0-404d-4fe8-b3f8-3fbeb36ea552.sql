CREATE TABLE IF NOT EXISTS public.user_safety_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  integrity_enabled boolean NOT NULL DEFAULT true,
  focus_enabled boolean NOT NULL DEFAULT false,
  prompt_injection_enabled boolean NOT NULL DEFAULT false,
  moderation_categories jsonb NOT NULL DEFAULT '{
    "Sexual": {"enabled": false, "level": "High"},
    "Violence": {"enabled": false, "level": "High"},
    "Violence Graphic": {"enabled": false, "level": "High"},
    "Harassment": {"enabled": false, "level": "High"},
    "Harassment Threatening": {"enabled": false, "level": "High"},
    "Hate": {"enabled": false, "level": "High"},
    "Hate Threatening": {"enabled": false, "level": "High"},
    "Self Harm": {"enabled": false, "level": "High"},
    "Self Harm Intent": {"enabled": false, "level": "High"},
    "Self Harm Instructions": {"enabled": false, "level": "High"}
  }'::jsonb,
  custom_guardrails jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_safety_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own safety settings"
  ON public.user_safety_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own safety settings"
  ON public.user_safety_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own safety settings"
  ON public.user_safety_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER user_safety_settings_set_updated_at
  BEFORE UPDATE ON public.user_safety_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();