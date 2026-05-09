
-- Fix slack_installations: deny all direct access (tokens should only be managed by service role in edge functions)
CREATE POLICY "Deny select slack installations"
  ON public.slack_installations FOR SELECT
  USING (false);

CREATE POLICY "Deny insert slack installations"
  ON public.slack_installations FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny update slack installations"
  ON public.slack_installations FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny delete slack installations"
  ON public.slack_installations FOR DELETE
  USING (false);

-- Fix slack_user_links: add INSERT policy so users can link their own accounts
CREATE POLICY "Users can insert their own slack links"
  ON public.slack_user_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix microsoft_workspace_tokens: deny direct INSERT/UPDATE/DELETE (managed by service role)
CREATE POLICY "Deny insert microsoft workspace tokens"
  ON public.microsoft_workspace_tokens FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny update microsoft workspace tokens"
  ON public.microsoft_workspace_tokens FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny delete microsoft workspace tokens"
  ON public.microsoft_workspace_tokens FOR DELETE
  USING (false);

-- Restrict microsoft_workspace_tokens SELECT to deny direct access (tokens managed server-side)
DROP POLICY IF EXISTS "Users can view their own microsoft tokens" ON public.microsoft_workspace_tokens;
CREATE POLICY "Deny select microsoft workspace tokens"
  ON public.microsoft_workspace_tokens FOR SELECT
  USING (false);
