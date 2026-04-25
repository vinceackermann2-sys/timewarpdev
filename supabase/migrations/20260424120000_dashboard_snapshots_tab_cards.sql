-- Persist last dashboard tab payloads so assistant chat can render briefing / updates / to-dos / objectives cards.
ALTER TABLE public.dashboard_snapshots
  ADD COLUMN IF NOT EXISTS tab_cards jsonb;

COMMENT ON COLUMN public.dashboard_snapshots.tab_cards IS 'Last dashboard-insights tabs payload: { Briefing, Updates, To-Dos, Objectives } card arrays for chat replay.';
