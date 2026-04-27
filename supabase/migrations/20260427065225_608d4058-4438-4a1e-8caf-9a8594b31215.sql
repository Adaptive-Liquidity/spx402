-- Wave 1b: Live tape + failure decoder support
-- Indexes for the new tape ledger UI and the failure reconciler.

CREATE INDEX IF NOT EXISTS agent_events_occurred_at_desc_idx
  ON public.agent_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS agent_events_signature_idx
  ON public.agent_events (signature);

CREATE INDEX IF NOT EXISTS agent_events_severity_recent_idx
  ON public.agent_events (occurred_at DESC)
  WHERE severity IN ('critical', 'warn');

-- Realtime: stream agent_events inserts to the live tape on the homepage.
-- Wrapped in a DO block because adding the same table twice raises an error
-- on re-run, but pg_publication has no IF NOT EXISTS for ADD TABLE.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'agent_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events';
  END IF;
END
$$;

-- Ensure the realtime broadcast carries the full new row so subscribers can
-- render the tape line without an extra fetch.
ALTER TABLE public.agent_events REPLICA IDENTITY FULL;