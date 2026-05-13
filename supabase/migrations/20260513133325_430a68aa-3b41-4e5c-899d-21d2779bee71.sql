
-- long_task_runs: owner-scoped writes
CREATE POLICY "Users can insert own long task runs" ON public.long_task_runs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own long task runs" ON public.long_task_runs
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own long task runs" ON public.long_task_runs
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- long_task_checkpoints: writes scoped via parent run ownership
CREATE POLICY "Users can insert own long task checkpoints" ON public.long_task_checkpoints
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.long_task_runs r WHERE r.id = long_task_checkpoints.run_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can update own long task checkpoints" ON public.long_task_checkpoints
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.long_task_runs r WHERE r.id = long_task_checkpoints.run_id AND r.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.long_task_runs r WHERE r.id = long_task_checkpoints.run_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own long task checkpoints" ON public.long_task_checkpoints
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.long_task_runs r WHERE r.id = long_task_checkpoints.run_id AND r.user_id = auth.uid())
  );

-- ai_business_learning_events: owner-scoped insert/delete
CREATE POLICY "Users can insert own AI learning events" ON public.ai_business_learning_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own AI learning events" ON public.ai_business_learning_events
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- dashboard_card_events: owner-scoped insert/delete
CREATE POLICY "Users can insert own dashboard card events" ON public.dashboard_card_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own dashboard card events" ON public.dashboard_card_events
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- dashboard_objective_outcomes: owner-scoped insert/delete
CREATE POLICY "Users can insert own dashboard objective outcomes" ON public.dashboard_objective_outcomes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own dashboard objective outcomes" ON public.dashboard_objective_outcomes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- business_learning_state: owner-scoped writes
CREATE POLICY "Users can insert own business learning state" ON public.business_learning_state
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own business learning state" ON public.business_learning_state
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own business learning state" ON public.business_learning_state
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Realtime: restrict channel subscriptions to topics owned by the authenticated user.
-- Topic convention: "user:{auth.uid()}" or "workspace:{workspace_id}" where the user is a member.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read own realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can read own realtime topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    (realtime.topic() = 'user:' || auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND realtime.topic() = 'workspace:' || wm.workspace_id::text
    )
  );

DROP POLICY IF EXISTS "Authenticated can broadcast to own realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can broadcast to own realtime topics"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (realtime.topic() = 'user:' || auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND realtime.topic() = 'workspace:' || wm.workspace_id::text
    )
  );
