CREATE TABLE public.timewarp_chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_message text,
  ai_reply text,
  page_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.timewarp_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own chats" ON public.timewarp_chats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);