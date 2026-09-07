-- Lets PostgREST embed the agent row in agent_events queries, so the public
-- evidence endpoint fetches event + subject in ONE round-trip instead of two.
-- NOT VALID: existing rows are not re-checked (orphan mints, if any, stay),
-- and PostgREST only needs the constraint to exist for embedding to work.
ALTER TABLE public.agent_events
  ADD CONSTRAINT agent_events_mint_fkey
  FOREIGN KEY (mint) REFERENCES public.agents(mint)
  NOT VALID;