DROP POLICY IF EXISTS "Users can view own or workspace chat sessions" ON public.agent_chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON public.agent_chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.agent_chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.agent_chat_sessions;
DROP POLICY IF EXISTS "Users can update own or workspace chat sessions" ON public.agent_chat_sessions;
DROP POLICY IF EXISTS "Users can delete own or workspace chat sessions" ON public.agent_chat_sessions;
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.agent_chat_sessions;

CREATE POLICY "Users can view own chat sessions"
ON public.agent_chat_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat sessions"
ON public.agent_chat_sessions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chat sessions"
ON public.agent_chat_sessions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own chat sessions"
ON public.agent_chat_sessions FOR DELETE
TO authenticated
USING (user_id = auth.uid());